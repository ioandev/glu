import { Router, type Request, type Response } from "express";
import {
  TODOIST_AUTHORIZE_URL,
  TODOIST_SCOPE,
  appUrl,
  isConfigured,
  redirectUri,
  type ServerConfig,
} from "./config";
import {
  STATE_COOKIE,
  clearSession,
  clearState,
  mintState,
  readSession,
  verifyState,
  writeSession,
  writeState,
  type TokenSet,
} from "./session";
import { TodoistError, exchangeCode, fetchUser, isExpired, refreshTokens } from "./todoist";

/**
 * The four auth endpoints (ADR 11). Express 5 handles rejected async handlers
 * natively — no `express-async-errors` shim, don't cargo-cult one in.
 */
export function authRoutes(config: ServerConfig): Router {
  const router = Router();

  router.get("/todoist/login", (req: Request, res: Response) => {
    if (!isConfigured(config)) {
      // No app registered: say so plainly instead of bouncing to a broken
      // Todoist page.
      res.status(503).json({ error: "todoist_not_configured" });
      return;
    }
    const state = mintState(config);
    writeState(res, config, state);

    const url = new URL(TODOIST_AUTHORIZE_URL);
    url.searchParams.set("client_id", config.clientId);
    url.searchParams.set("scope", TODOIST_SCOPE);
    url.searchParams.set("state", state);
    url.searchParams.set("redirect_uri", redirectUri(config));
    res.redirect(url.toString());
  });

  router.get("/todoist/callback", async (req: Request, res: Response) => {
    const { code, state } = req.query as { code?: string; state?: string };
    const expected = req.cookies?.[STATE_COOKIE];
    clearState(res, config);

    // A mismatch is a CSRF attempt or a stale tab: no session, ever.
    if (!state || !expected || state !== expected) {
      res.status(403).json({ error: "state_mismatch" });
      return;
    }
    // Additional to the cookie check, never instead of it: a state that carries
    // no valid verification-token signature was not minted here. No-op unless
    // TODOIST_VERIFICATION_TOKEN is set (ADR 11 amendment).
    if (!verifyState(config, state)) {
      res.status(403).json({ error: "state_unverified" });
      return;
    }
    if (!code) {
      res.status(400).json({ error: "missing_code" });
      return;
    }

    try {
      const tokens = await exchangeCode(config, code);
      await writeSession(res, config, tokens);
    } catch (error) {
      const status = error instanceof TodoistError ? error.status : 502;
      res.status(status).json({ error: "exchange_failed" });
      return;
    }

    res.redirect(appUrl(config));
  });

  router.get("/todoist/status", async (req: Request, res: Response) => {
    const tokens = await readSession(req, config);
    if (!tokens) {
      res.json({ authenticated: false });
      return;
    }

    let live: TokenSet = tokens;
    if (isExpired(tokens)) {
      try {
        live = await refreshTokens(config, tokens);
        await writeSession(res, config, live);
      } catch (error) {
        // Logged distinctly: Todoist rotates refresh tokens, so a two-tab
        // rotation race must not be misread as revocation (ADR 11).
        console.warn("[glu] todoist refresh failed", (error as Error).message);
        clearSession(res, config);
        res.json({ authenticated: false });
        return;
      }
    }

    try {
      const user = await fetchUser(live);
      res.json({
        authenticated: true,
        name: user.full_name ?? user.name ?? null,
        id: user.id,
      });
    } catch {
      // Revoked at Todoist degrades to logged out, never to an error screen.
      clearSession(res, config);
      res.json({ authenticated: false });
    }
  });

  router.post("/todoist/logout", (_req: Request, res: Response) => {
    clearSession(res, config);
    res.json({ authenticated: false });
  });

  return router;
}

/**
 * Shared by every proxied route: hand back a live token set or answer 401.
 * All future Todoist traffic goes through here, so refresh lives in exactly one
 * place and the token never reaches the browser (ADR 11's standing rule).
 */
export async function requireTokens(
  req: Request,
  res: Response,
  config: ServerConfig,
): Promise<TokenSet | null> {
  const tokens = await readSession(req, config);
  if (!tokens) {
    res.status(401).json({ error: "unauthenticated" });
    return null;
  }
  if (!isExpired(tokens)) return tokens;

  try {
    const refreshed = await refreshTokens(config, tokens);
    await writeSession(res, config, refreshed);
    return refreshed;
  } catch (error) {
    console.warn("[glu] todoist refresh failed", (error as Error).message);
    clearSession(res, config);
    res.status(401).json({ error: "unauthenticated" });
    return null;
  }
}
