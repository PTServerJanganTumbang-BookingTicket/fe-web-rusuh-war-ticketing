import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["src/**/*.test.{ts,tsx}"],
    passWithNoTests: true,
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "lcov"],
      // Domain, application, dan infrastructure wajib teruji (testing.md); presentation diuji lewat
      // test mapper/ViewModel dan e2e, view lewat story.
      include: [
        "src/core/**/*.ts",
        "src/platform/**/*.ts",
        "src/modules/*/{domain,application,infrastructure}/**/*.ts",
        "src/di/**/*.ts",
      ],
      thresholds: { statements: 85, branches: 85, functions: 85, lines: 85 },
      exclude: ["**/*.test.ts", "**/__tests__/**", "src/di/server.ts"],
    },
  },
});
