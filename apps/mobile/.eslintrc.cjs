module.exports = {
  root: false,
  extends: [
    "../../packages/config/eslint/index.cjs"
  ],
  plugins: ["react-native"],
  rules: {
    "react/react-in-jsx-scope": "off"
  }
};

