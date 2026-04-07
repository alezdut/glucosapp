const nextJest = require("next/jest");

const createJestConfig = nextJest({
  dir: "./",
});

const customJestConfig = {
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  testPathIgnorePatterns: ["<rootDir>/.next/", "<rootDir>/node_modules/"],
  collectCoverageFrom: [
    "<rootDir>/src/**/*.{ts,tsx}",
    "!<rootDir>/src/**/*.test.{ts,tsx}",
    "!<rootDir>/src/**/*.spec.{ts,tsx}",
    "!<rootDir>/src/**/__tests__/**",
    "!<rootDir>/src/**/*.d.ts",
    "!<rootDir>/src/**/*.module.css",
    "!<rootDir>/src/app/globals.css",
    "!<rootDir>/src/app/layout.tsx",
  ],
  coverageThreshold: {
    global: {
      branches: 10,
      functions: 17,
      lines: 20,
      statements: 20,
    },
  },
  coverageReporters: ["text", "lcov"],
};

module.exports = createJestConfig(customJestConfig);
