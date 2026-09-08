// Shared ESLint flat config for React (web/ui) packages.
import base from "./base.mjs";
import globals from "globals";

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...base,
  {
    languageOptions: {
      globals: { ...globals.browser },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
  },
];
