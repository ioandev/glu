/**
 * The one place the API base lives. ADR 01's rule — never hardcode a
 * root-relative URL — applies double here: `/glu/api` is a *server* route, not
 * a Next page, so `next/link` and the basePath machinery do not apply to it.
 */
export const API_BASE = "/glu/api";

export const apiUrl = (path: string) => `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type UnauthorizedHandler = () => void;
const unauthorizedHandlers = new Set<UnauthorizedHandler>();

/**
 * ADR 19: every proxy 401 funnels through here, so "logged out" is decided in
 * exactly one place instead of per-surface. Registered by the auth store; kept
 * here so the fetch layer never imports the store (and cannot cycle).
 */
export function onProxyUnauthorized(handler: UnauthorizedHandler): () => void {
  unauthorizedHandlers.add(handler);
  return () => {
    unauthorizedHandlers.delete(handler);
  };
}

/** Same-origin by construction; the sealed cookie rides along automatically. */
export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(apiUrl(path), {
    credentials: "same-origin",
    ...init,
    headers: {
      ...(init.body ? { "content-type": "application/json" } : {}),
      ...init.headers,
    },
  });

  if (!response.ok) {
    // 401 and only 401: an upstream Todoist error relayed as 502 must not log
    // the user out (ADR 19).
    if (response.status === 401) {
      for (const handler of [...unauthorizedHandlers]) handler();
    }
    throw new ApiError(`${init.method ?? "GET"} ${path} failed`, response.status);
  }
  if (response.status === 204) return undefined as T;
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}
