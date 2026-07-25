import { createApp } from "./app";
import { isConfigured, readConfig } from "./config";

/**
 * Dev and prod both load `backend/.env` through Node's own
 * `--env-file-if-exists` flag (see the npm scripts) — no dotenv dependency.
 */

const config = readConfig();
const app = createApp(config);

app.listen(config.port, () => {
  const state = isConfigured(config)
    ? "Todoist app configured"
    : "no Todoist app configured — the UI will show a clean logged-out state";
  console.log(`[glu] api listening on :${config.port} (${state})`);
});
