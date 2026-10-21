const nextJest = require("next/jest");

const createJestConfig = nextJest({
  dir: "./",
});

const customJestConfig = {
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^@glucosapp/api-client$": "<rootDir>/../../packages/api-client/src/index.ts",
    "^@glucosapp/auth-utils$": "<rootDir>/../../packages/auth-utils/src/index.ts",
    "^@glucosapp/env$": "<rootDir>/../../packages/env/src/index.ts",
    "^@glucosapp/theme$": "<rootDir>/../../packages/theme/src/index.ts",
    "^@glucosapp/types$": "<rootDir>/../../packages/types/src/index.ts",
    "^@glucosapp/utils$": "<rootDir>/../../packages/utils/src/index.ts",
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
      branches: 70,
      functions: 82,
      lines: 82,
      statements: 82,
    },
  },
  coverageReporters: ["text", "lcov"],
};

module.exports = createJestConfig(customJestConfig);
