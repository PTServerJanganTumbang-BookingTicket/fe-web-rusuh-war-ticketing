import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["src/**/*.test.{ts,tsx}"],
    passWithNoTests: true,
    setupFiles: ["./src/test/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "lcov"],
      // Semua kode logika di src dihitung, termasuk file yang belum punya test (`all`), supaya SonarCloud
      // tidak menganggapnya 0%. Yang dikecualikan hanya presentasional atau infrastruktur uji:
      // view dan components/ui (Storybook), halaman dan layout (e2e), mock MSW, dan dukungan test.
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "**/*.test.{ts,tsx}",
        "**/__tests__/**",
        "**/*.stories.tsx",
        "**/*.d.ts",
        "src/test/**",
        "src/mocks/**",
        "src/components/ui/**",
        "src/modules/*/views/**",
        "src/app/**/{page,layout,loading,error,not-found}.tsx",
        "src/app/**/{opengraph,icon}-image.tsx",
        "**/*.constants.ts",
        "src/instrumentation.ts",
        "src/di/server-dependencies.ts",
      ],
      thresholds: { statements: 85, branches: 85, functions: 85, lines: 85 },
    },
  },
});
