import { defineConfig } from "vitest/config";

/**
 * The backend's own suite (ADR 11). Before the backend/ + web/ split this was
 * the `server` project inside the web config's `projects` array; it is a plain
 * standalone config now that the two packages install separately.
 */
export default defineConfig({
  test: {
    name: "backend",
    environment: "node",
    include: ["**/*.test.ts"],
    exclude: ["node_modules/**", "dist/**"],
  },
});
