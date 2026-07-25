import {
  REFRESH_SKEW_MS,
  TODOIST_API_BASE,
  TODOIST_TOKEN_URL,
  redirectUri,
  type ServerConfig,
} from "./config";
import type { TokenSet } from "./session";

export type { TokenSet };

/** Every upstream call gets an explicit timeout — a hung proxy is a hung app. */
const UPSTREAM_TIMEOUT_MS = 10_000;

export class TodoistError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "TodoistError";
  }
}

async function withTimeout<T>(run: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  try {
    return await run(controller.signal);
  } finally {
    clearTimeout(timer);
  }
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
}

function toTokenSet(body: TokenResponse, previous?: TokenSet): TokenSet {
  return {
    accessToken: body.access_token,
    // Todoist rotates refresh tokens; keep the previous one if a refresh
    // response omits it.
    refreshToken: body.refresh_token ?? previous?.refreshToken,
    // New apps get one-hour tokens by default — non-expiring tokens are
    // legacy-only, so refresh handling is mandatory from v1 (ADR 11).
    expiresAt: Date.now() + (body.expires_in ?? 3600) * 1000,
  };
}

export async function exchangeCode(config: ServerConfig, code: string): Promise<TokenSet> {
  const response = await withTimeout((signal) =>
    fetch(TODOIST_TOKEN_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code,
        redirect_uri: redirectUri(config),
      }),
      signal,
    }),
  );

  if (!response.ok) {
    throw new TodoistError(`Token exchange failed (${response.status})`, 502);
  }
  return toTokenSet((await response.json()) as TokenResponse);
}

export async function refreshTokens(
  config: ServerConfig,
  tokens: TokenSet,
): Promise<TokenSet> {
  const refreshToken = tokens.refreshToken;
  if (!refreshToken) {
    throw new TodoistError("No refresh token", 401);
  }
  const response = await withTimeout((signal) =>
    fetch(TODOIST_TOKEN_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
      signal,
    }),
  );

  if (!response.ok) {
    throw new TodoistError(`Token refresh failed (${response.status})`, 401);
  }
  return toTokenSet((await response.json()) as TokenResponse, tokens);
}

export const isExpired = (tokens: TokenSet, now = Date.now()) =>
  tokens.expiresAt - REFRESH_SKEW_MS <= now;

/** Authenticated GET against Todoist's API, with the bearer never leaving here. */
export async function todoistGet<T>(
  tokens: TokenSet,
  path: string,
  query: Record<string, string | undefined> = {},
): Promise<T> {
  const url = new URL(`${TODOIST_API_BASE}${path}`);
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) url.searchParams.set(key, value);
  }

  const response = await withTimeout((signal) =>
    fetch(url, {
      headers: { authorization: `Bearer ${tokens.accessToken}` },
      signal,
    }),
  );

  if (!response.ok) {
    throw new TodoistError(`Todoist GET ${path} failed`, response.status);
  }
  return (await response.json()) as T;
}

export async function todoistPost<T>(
  tokens: TokenSet,
  path: string,
  body: unknown,
): Promise<T> {
  const response = await withTimeout((signal) =>
    fetch(`${TODOIST_API_BASE}${path}`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${tokens.accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(body ?? {}),
      signal,
    }),
  );

  if (!response.ok) {
    throw new TodoistError(`Todoist POST ${path} failed`, response.status);
  }
  if (response.status === 204) return undefined as T;
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export interface TodoistUser {
  id: string;
  full_name?: string;
  name?: string;
  email?: string;
}

/** ADR 11 amendment: ADR 14 needs the user id to filter comment authorship. */
export async function fetchUser(tokens: TokenSet): Promise<TodoistUser> {
  return todoistGet<TodoistUser>(tokens, "/user");
}
