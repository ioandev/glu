import express, { type Express } from "express";
import cookieParser from "cookie-parser";
import { API_BASE_PATH, readConfig, type ServerConfig } from "./config";
import { authRoutes } from "./authRoutes";
import { todoistRoutes } from "./todoistRoutes";
import {
  API_LIMIT,
  AUTH_LIMIT,
  TODOIST_LIMIT,
  errorHandler,
  rateLimit,
  rejectCrossOriginWrites,
  securityHeaders,
} from "./security";

/**
 * The GLU API: a **stateless Todoist proxy** and nothing else (ADR 11). No
 * database, no session store — the sealed cookie is the whole persistence
 * story, permanently.
 *
 * Mounted at `/glu/api` in both environments so the server's own route table
 * matches the public URLs (dev via the Next rewrite, prod via Caddy).
 */
export function createApp(config: ServerConfig = readConfig()): Express {
  const app = express();
  app.disable("x-powered-by");
  // Exactly one hop: Caddy. Express then reads the client address Caddy
  // appended to `X-Forwarded-For` instead of Caddy's own — without this the
  // rate limiter below buckets every request behind the proxy together.
  app.set("trust proxy", 1);
  // First, so every exit carries them — including the 404 and the terminal
  // error handler, which is where a proxy-owned header would still have
  // applied but an app-owned one is easy to forget (ADR 16 amendment).
  app.use(securityHeaders());
  app.use(express.json({ limit: "64kb" }));
  app.use(cookieParser());

  const api = express.Router();
  // Above the limiter on purpose: a 429 here fails the container healthcheck,
  // which flips the service unhealthy, which trips Caddy's `depends_on` — an
  // outage manufactured by the component that exists to prevent one (ADR 24).
  api.get("/healthz", (_req, res) => {
    res.json({ ok: true, service: "glu-api" });
  });
  // The floor under everything, including requests that reach no router at all:
  // 404 probes and body-parse failures still cost `express.json()` (ADR 24).
  api.use(rateLimit({ ...API_LIMIT, label: "api" }));
  // Every write, on every route, present and future (ADR 11 amendment).
  api.use(rejectCrossOriginWrites(config));
  // Tighter buckets per route family, nested under the floor. Auth is the sole
  // unauthenticated surface that reaches Todoist; the todoist family spends the
  // user's upstream budget, so its sustained rate sits below Todoist's own.
  api.use("/auth", rateLimit({ ...AUTH_LIMIT, label: "auth" }), authRoutes(config));
  api.use("/todoist", rateLimit({ ...TODOIST_LIMIT, label: "todoist" }), todoistRoutes(config));

  app.use(API_BASE_PATH, api);

  // Anything else under the API prefix is a 404 as JSON, not an HTML page.
  app.use(API_BASE_PATH, (_req, res) => {
    res.status(404).json({ error: "not_found" });
  });

  // Terminal: body-parser and any uncaught handler error leave as JSON too.
  app.use(errorHandler());

  return app;
}
