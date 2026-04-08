module.exports = {
  root: false,
  extends: ["../../packages/config/eslint/index.cjs"],
  ignorePatterns: ["src/**/*.spec.ts", "src/common/test-helpers/**"],
  overrides: [
    {
      files: ["src/**/*.ts"],
      rules: {
        "@typescript-eslint/no-explicit-any": "off",
      },
    },
    {
      files: ["scripts/**/*.ts"],
      rules: {
        "@typescript-eslint/no-explicit-any": "off",
        "@typescript-eslint/no-unused-vars": "off",
      },
    },
  ],
};
