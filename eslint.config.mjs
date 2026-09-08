// Root ESLint flat config. ESLint walks up from each package to find this,
// so individual packages don't need their own config.
import base from "@entegreflow/config/eslint/base";
import globals from "globals";

export default [
  ...base,
  {
    // React surfaces get browser globals + JSX.
    files: ["apps/web/**/*.{ts,tsx}", "packages/ui/**/*.{ts,tsx}", "packages/icons/**/*.{ts,tsx}"],
    languageOptions: {
      globals: { ...globals.browser },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
  {
    // NestJS DI relies on emitted decorator metadata: forcing `import type` on a
    // class used as a constructor-injected dependency ELIDES that metadata and
    // breaks runtime DI. Disable the rule for the Nest backends.
    files: ["apps/api/**/*.ts", "apps/worker/**/*.ts", "packages/server/**/*.ts"],
    rules: {
      "@typescript-eslint/consistent-type-imports": "off",
    },
  },
  {
    // Tests may use devalued patterns.
    files: ["**/*.{test,spec}.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "no-console": "off",
    },
  },
];
