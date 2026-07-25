import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
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

/** Separates nonce from signature. base64url never produces one, so the first
 * `.` is unambiguously the split point. */
const STATE_SEPARATOR = ".";

/**
 * Mint the OAuth `state` (ADR 11 amendment). Always a fresh random nonce — the
 * cookie-bound nonce is what stops CSRF, and nothing here weakens it.
 *
 * When the App Management Console's **verification token** is configured, the
 * nonce is signed with it and the signature rides along. The token itself is
 * never sent: `state` travels in a URL and lands in browser history, referrer
 * headers and every access log between here and Todoist, so a static per-app
 * secret has no business being in it. Signing keeps the token server-side and
 * still proves a returning `state` was minted by this app registration.
 */
export function mintState(config: ServerConfig): string {
  const nonce = randomBytes(24).toString("base64url");
  if (!config.verificationToken) return nonce;
  return `${nonce}${STATE_SEPARATOR}${signNonce(config, nonce)}`;
}

function signNonce(config: ServerConfig, nonce: string): string {
  return createHmac("sha256", config.verificationToken).update(nonce).digest("base64url");
}

/**
 * The second half of the callback check, and only ever *additional* to the
 * cookie comparison: that one proves this browser started the flow, this one
 * proves the state carries this app's verification token. With no token
 * configured there is nothing to prove and every state passes.
 */
export function verifyState(config: ServerConfig, state: string): boolean {
  if (!config.verificationToken) return true;
  const cut = state.indexOf(STATE_SEPARATOR);
  if (cut <= 0) return false;
  return constantTimeEqual(signNonce(config, state.slice(0, cut)), state.slice(cut + 1));
}

function constantTimeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  // timingSafeEqual throws on a length mismatch — and the signature's length is
  // fixed and public, so short-circuiting on it leaks nothing.
  return left.length === right.length && timingSafeEqual(left, right);
}

export function clearState(res: Response, config: ServerConfig): void {
  res.clearCookie(STATE_COOKIE, baseCookieOptions(config));
}
