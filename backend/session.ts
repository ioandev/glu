import type { Request, Response } from "express";
import { sealData, unsealData } from "iron-session";
import type { ServerConfig } from "./config";

/**
 * The sealed httpOnly cookie **is** the token store (ADR 11): the browser holds
 * an encrypted blob, only the server can open it, and the server stores
 * nothing. A database for one user's cookie-sized secret is architecture
 * cosplay.
 */
export const SESSION_COOKIE = "glu_todoist";
export const STATE_COOKIE = "glu_oauth_state";
export const COOKIE_PATH = "/glu";

/** The CSRF `state` only has to survive the consent round trip. */
export const STATE_TTL_MS = 10 * 60 * 1000;

export interface TokenSet {
  accessToken: string;
  refreshToken?: string;
  /** Epoch ms. */
  expiresAt: number;
}

function baseCookieOptions(config: ServerConfig) {
  return {
    httpOnly: true,
    secure: config.secureCookies,
    // NOT `Strict`: the OAuth callback arrives as a top-level cross-site GET,
    // and Strict would withhold the cookie — the classic "works in one tab,
    // 403s in the next" bug (ADR 11).
    sameSite: "lax" as const,
    path: COOKIE_PATH,
  };
}

export async function writeSession(
  res: Response,
  config: ServerConfig,
  tokens: TokenSet,
): Promise<void> {
  const sealed = await sealData(tokens, { password: config.sessionSecret });
  res.cookie(SESSION_COOKIE, sealed, {
    ...baseCookieOptions(config),
    maxAge: 400 * 24 * 60 * 60 * 1000,
  });
}

export async function readSession(
  req: Request,
  config: ServerConfig,
): Promise<TokenSet | null> {
  const sealed = req.cookies?.[SESSION_COOKIE];
  if (typeof sealed !== "string" || sealed === "") return null;
  try {
    const tokens = await unsealData<TokenSet>(sealed, { password: config.sessionSecret });
    return tokens?.accessToken ? tokens : null;
  } catch {
    // A tampered or stale-key cookie degrades to logged out, never to an error.
    return null;
  }
}

export function clearSession(res: Response, config: ServerConfig): void {
  res.clearCookie(SESSION_COOKIE, baseCookieOptions(config));
}

export function writeState(res: Response, config: ServerConfig, state: string): void {
  res.cookie(STATE_COOKIE, state, { ...baseCookieOptions(config), maxAge: STATE_TTL_MS });
}

export function clearState(res: Response, config: ServerConfig): void {
  res.clearCookie(STATE_COOKIE, baseCookieOptions(config));
}
