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
      // Domain, application, dan data wajib teruji (testing.md); controller diuji lewat test mapper/controller
      // dan e2e, view lewat story.
      include: [
        "src/core/{domain,application,data}/**/*.ts",
        "src/modules/*/{domain,application,data}/**/*.ts",
        "src/di/**/*.ts",
      ],
      thresholds: { statements: 85, branches: 85, functions: 85, lines: 85 },
      exclude: ["**/*.test.ts", "src/di/server-dependencies.ts"],
    },
  },
});
