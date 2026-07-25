import { defineConfig, devices } from "@playwright/test";

/**
 * ADR 09. The suite runs against the **production build** — dev mode forgives
 * what prod does not, and prod-under-`basePath` is a primary target here.
 *
 * `E2E_BASE_URL` parameterises the target so the identical suite later smoke-
 * tests `https://ioan.dev/glu` (ADR 16's deploy job) instead of growing its own.
 */
const PORT = Number(process.env.E2E_PORT ?? 3210);
const LOCAL_BASE = `http://localhost:${PORT}/glu/`;
const baseURL = process.env.E2E_BASE_URL ?? LOCAL_BASE;
const usesLocalServer = !process.env.E2E_BASE_URL;

/** The two real targets — tablet and half-tablet. Nothing more. */
const TABLET = { width: 1180, height: 820 };
const HALF_TABLET = { width: 590, height: 900 };

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 1,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"]],
  timeout: 30_000,
  expect: { timeout: 7_000 },

  use: {
    baseURL,
    // Trace only on retry: cheap when green, complete when red.
    trace: "on-first-retry",
    video: "off",
  },

  projects: [
    {
      name: "chromium-tablet",
      use: { ...devices["Desktop Chrome"], viewport: TABLET },
    },
    {
      name: "chromium-half-tablet",
      use: { ...devices["Desktop Chrome"], viewport: HALF_TABLET, hasTouch: true },
    },
    {
      name: "webkit-tablet",
      use: { ...devices["Desktop Safari"], viewport: TABLET },
    },
    {
      name: "webkit-half-tablet",
      use: { ...devices["Desktop Safari"], viewport: HALF_TABLET, hasTouch: true },
    },
  ],

  webServer: usesLocalServer
    ? {
        command: `npm run build && npx next start -p ${PORT}`,
        url: `${LOCAL_BASE}healthz`,
        timeout: 240_000,
        reuseExistingServer: !process.env.CI,
        stdout: "ignore",
        stderr: "pipe",
      }
    : undefined,
});
