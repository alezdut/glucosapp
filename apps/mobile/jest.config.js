module.exports = {
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  testMatch: ["**/__tests__/**/*.test.ts?(x)", "**/?(*.)+(spec|test).ts?(x)"],
  transform: {
    "^.+\\.[jt]sx?$": "babel-jest",
  },
  moduleNameMapper: {
    "^react-native$": "<rootDir>/test/react-native-mock.tsx",
    "^react-native-gesture-handler$": "<rootDir>/test/react-native-gesture-handler-mock.tsx",
    "^expo-linking$": "<rootDir>/test/expo-linking-mock.ts",
    "^expo-web-browser$": "<rootDir>/test/expo-web-browser-mock.ts",
    "^expo-notifications$": "<rootDir>/test/expo-notifications-mock.ts",
  },
  transformIgnorePatterns: ["node_modules/(?!(expo|@expo|expo-linking|expo-web-browser)/)"],
  testPathIgnorePatterns: ["<rootDir>/node_modules/"],
};
