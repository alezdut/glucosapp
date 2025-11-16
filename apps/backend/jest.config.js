module.exports = {
  moduleFileExtensions: ["js", "json", "ts"],
  rootDir: "src",
  testRegex: ".*\\.spec\\.ts$",
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
};
