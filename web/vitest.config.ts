import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import { playwright } from "@vitest/browser-playwright";

const dirname =
  typeof __dirname !== "undefined" ? __dirname : path.dirname(fileURLToPath(import.meta.url));

/**
 * Two layers, matching where the risk lives (ADR 03):
 *   `unit`      — jsdom + Testing Library for the store, hooks and reducers.
 *   `storybook` — every story's play function, headless in real Chromium.
 *
 * The third project used to be `server`; it moved to backend/vitest.config.ts
 * when the two halves became independent packages.
 */
export default defineConfig({
  resolve: {
    alias: { "@": path.join(dirname, "src") },
  },
  test: {
    projects: [
      {
        extends: true,
        plugins: [react()],
        test: {
          name: "unit",
          environment: "jsdom",
          // jsdom's default `about:blank` is an opaque origin, where
          // localStorage is inert — the store's whole persistence layer needs a
          // real origin to test against.
          environmentOptions: { jsdom: { url: "http://localhost:3000/glu" } },
          globals: true,
          include: ["src/**/*.test.{ts,tsx}"],
          setupFiles: [path.join(dirname, "vitest.setup.ts")],
        },
      },
      {
        extends: true,
        plugins: [storybookTest({ configDir: path.join(dirname, ".storybook") })],
        test: {
          name: "storybook",
          browser: {
            enabled: true,
            headless: true,
            provider: playwright({}),
            instances: [{ browser: "chromium" }],
          },
        },
      },
    ],
  },
});
