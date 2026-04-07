import nextJest from "next/jest";

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
      branches: 5,
      functions: 12,
      lines: 14,
      statements: 14,
    },
  },
  coverageReporters: ["text", "lcov"],
};

export default createJestConfig(customJestConfig);
