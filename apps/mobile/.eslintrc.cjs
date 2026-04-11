module.exports = {
  root: false,
  extends: ["../../packages/config/eslint/react.cjs"],
  plugins: ["react-native"],
  rules: {
    "react/react-in-jsx-scope": "off",
  },
  overrides: [
    {
      files: [
        "**/*.test.{ts,tsx}",
        "**/__tests__/**/*.{ts,tsx}",
        "test/**/*.{ts,tsx}",
        "jest.setup.ts",
      ],
      rules: {
        "@typescript-eslint/no-unused-vars": "off",
        "@typescript-eslint/no-explicit-any": "off",
        "@typescript-eslint/no-var-requires": "off",
        "react/display-name": "off",
      },
    },
  ],
};
