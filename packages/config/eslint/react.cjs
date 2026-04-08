/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: false,
  extends: ["./base.cjs", "plugin:react/recommended", "plugin:react-hooks/recommended"],
  plugins: ["react", "react-hooks"],
  settings: { react: { version: "detect" } },
};
