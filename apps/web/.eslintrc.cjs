module.exports = {
  root: false,
  extends: [
    "next",
    "next/core-web-vitals",
    "../../packages/config/eslint/index.cjs"
  ],
  rules: {
    "react/react-in-jsx-scope": "off"
  }
};

