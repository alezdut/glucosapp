module.exports = {
  root: false,
  extends: ["../../packages/config/eslint/index.cjs"],
  overrides: [
    {
      files: ["dist/**/*"],
      rules: {
        "@typescript-eslint/no-explicit-any": "off"
      }
    }
  ]
};

