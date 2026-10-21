/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/*.spec.ts"],
  collectCoverageFrom: ["src/**/*.ts", "!src/**/*.spec.ts", "!src/index.ts"],
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
