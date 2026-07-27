// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from "eslint-plugin-storybook";

import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import security from "eslint-plugin-security";
import noUnsanitized from "eslint-plugin-no-unsanitized";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Security rules in the inner loop (ADR 38): unsafe patterns + DOM sinks
  // (innerHTML and friends) caught at lint time, not at audit time.
  security.configs.recommended,
  noUnsanitized.configs.recommended,
  {
    rules: {
      // Fires on essentially every computed property access in TS — a rule
      // that cries wolf teaches people to ignore the plugin (ADR 38).
      "security/detect-object-injection": "off",
    },
  },
  {
    // Node-side tooling and tests read paths they build from their own
    // constants — the rule exists for request-derived paths, which never
    // occur here (the app has no server fs access at all).
    files: ["scripts/**", "e2e/**", "**/*.test.{ts,tsx}"],
    rules: {
      "security/detect-non-literal-fs-filename": "off",
      // Same class: test assertions build RegExps from their own constants.
      "security/detect-non-literal-regexp": "off",
    },
  },
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
