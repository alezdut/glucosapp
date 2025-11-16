module.exports = {
  moduleFileExtensions: ["js", "json", "ts"],
  rootDir: "src",
  testRegex: ".*\\.spec\\.ts$",
  setupFilesAfterEnv: ["<rootDir>/../jest.setup.js"],
  transform: {
    "^.+\\.(t|j)s$": "ts-jest",
  },
  collectCoverageFrom: [
    "**/*.(t|j)s",
    "!**/*.spec.ts",
    "!**/*.interface.ts",
    "!**/*.dto.ts",
    "!**/*.module.ts",
    "!**/main.ts",
    "!**/prisma.service.ts",
    "!**/test-helpers/**",
    "!**/node_modules/**",
    "!**/dist/**",
  ],
  coverageDirectory: "../coverage",
  testEnvironment: "node",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
    "^@glucosapp/types$": "<rootDir>/../../../packages/types/src/index.ts",
    "^@glucosapp/(.*)$": "<rootDir>/../../../packages/$1/src",
    "^@glucosapp/mdi-insulin-algorithm$":
      "<rootDir>/../../../../mdi-insulin-algorithm/dist/index.cjs",
    "^mdi-insulin-algorithm$": "<rootDir>/../../../../mdi-insulin-algorithm/dist/index.cjs",
  },
  coverageThreshold: {
    global: {
      branches: 75,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  coverageReporters: ["text", "json", "html", "lcov"],
  testTimeout: 10000,
  maxWorkers: process.env.CI ? 2 : "50%",
};
