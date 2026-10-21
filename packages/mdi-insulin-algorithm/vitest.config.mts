import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "json", "html"],
      exclude: [
        "node_modules/",
        "dist/",
        "tests/",
        "**/*.config.ts",
        "**/*.d.ts",
        ".eslintrc.cjs",
        "src/index.ts",
      ],
      thresholds: {
        branches: 85,
        functions: 84,
        lines: 89,
        statements: 89,
      },
    },
  },
});
