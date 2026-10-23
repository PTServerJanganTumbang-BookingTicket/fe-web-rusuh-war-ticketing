import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import boundaries from "@rusuh/config/eslint/boundaries";
import layers from "@rusuh/config/eslint/layers";

const workspaces = ["apps/web", "packages/api", "packages/core", "packages/i18n", "packages/ui", "mocks"];

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  ...boundaries,
  ...layers,
  {
    settings: { next: { rootDir: "apps/web" } },
  },
  // npm menaruh semua dependency di node_modules root (hoisting), jadi impor tanpa deklarasi tetap
  // ter-resolve. Aturan ini mengembalikan jaring pengaman yang dulu diberikan pnpm: setiap workspace
  // hanya boleh mengimpor yang tertulis di package.json-nya sendiri, atau di devDependencies root
  // (alat bersama seperti vitest dan typescript). Lihat ADR-0014.
  ...workspaces.map((dir) => ({
    files: [`${dir}/**/*.{ts,tsx,mts}`],
    rules: { "import/no-extraneous-dependencies": ["error", { packageDir: [".", dir] }] },
  })),
  globalIgnores([
    "**/.next/**",
    "**/out/**",
    "**/build/**",
    "**/next-env.d.ts",
    "packages/api/generated/**",
    "apps/web/public/mockServiceWorker.js",
  ]),
]);
