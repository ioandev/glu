// The backend lints itself now. Before the backend/ + web/ split it was swept
// up by the web package's `eslint-config-next` — the wrong rule set for a Node
// server, and unavailable here since the two packages install separately.
import tseslint from "typescript-eslint";
import security from "eslint-plugin-security";

export default tseslint.config(
  { ignores: ["dist/**"] },
  ...tseslint.configs.recommended,
  // Security rules in the inner loop (ADR 38) — the tier that handles
  // tokens and proxies requests is where these earn their keep.
  security.configs.recommended,
  {
    rules: {
      // Fires on essentially every computed property access in TS — a rule
      // that cries wolf teaches people to ignore the plugin (ADR 38).
      "security/detect-object-injection": "off",
    },
  },
  {
    rules: {
      // Route handlers legitimately take `_req`; keep the underscore escape
      // hatch that eslint-config-next also allowed.
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
);
