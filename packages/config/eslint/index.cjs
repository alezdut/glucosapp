/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: false,
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
    "prettier"
  ],
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint", "react", "react-hooks"],
  env: { node: true, browser: true, es2022: true },
  settings: { react: { version: "detect" } }
};

