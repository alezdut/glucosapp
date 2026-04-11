/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: false,
  extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended", "prettier"],
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint"],
  env: { node: true, browser: true, es2022: true },
};
