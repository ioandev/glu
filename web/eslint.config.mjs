// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from "eslint-plugin-storybook";

import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Build outputs — never lint generated bundles.
    "storybook-static/**",
    "playwright-report/**",
    "test-results/**",
  ]),
  ...storybook.configs["flat/recommended"],
  {
    // Playwright's fixture API takes a callback named `use`; the React Hooks
    // rule sees `use(...)` and assumes the React hook of the same name.
    files: ["e2e/**/*.ts"],
    rules: {
      "react-hooks/rules-of-hooks": "off",
    },
  },
  {
    // Test doubles legitimately mutate module-scope fixture state between
    // renders (mocked hooks, captured hook returns) — the app rules do not fit.
    files: ["**/*.test.{ts,tsx}"],
    rules: {
      "react-hooks/globals": "off",
      "react-hooks/immutability": "off",
      "react-hooks/set-state-in-effect": "off",
    },
  },
]);

export default eslintConfig;
