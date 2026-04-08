module.exports = {
  root: false,
  extends: ["../../packages/config/eslint/react.cjs"],
  plugins: ["react-native"],
  rules: {
    "react/react-in-jsx-scope": "off",
  },
};
