import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Kontrol simulasi pembayaran hanya ada di mode mock; test ViewModel berjalan di mode itu.
    env: { NEXT_PUBLIC_API_MOCKING: "enabled" },
    // packages/config/conventions: test konvensi letak dan nama file seluruh repo.
    include: ["packages/*/src/**/*.test.{ts,tsx}", "apps/web/**/__tests__/**/*.test.{ts,tsx}", "packages/config/conventions/*.test.ts"],
    passWithNoTests: true,
  },
});
