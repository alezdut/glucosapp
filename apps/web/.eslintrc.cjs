module.exports = {
  root: false,
  extends: ["next", "next/core-web-vitals", "../../packages/config/eslint/react.cjs"],
  overrides: [
    {
      files: ["*.cjs"],
      rules: {
        "@typescript-eslint/no-var-requires": "off",
      },
    },
  ],
  rules: {
    "react/react-in-jsx-scope": "off",
  },
};
