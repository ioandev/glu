// The backend lints itself now. Before the backend/ + web/ split it was swept
// up by the web package's `eslint-config-next` — the wrong rule set for a Node
// server, and unavailable here since the two packages install separately.
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist/**"] },
  ...tseslint.configs.recommended,
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
