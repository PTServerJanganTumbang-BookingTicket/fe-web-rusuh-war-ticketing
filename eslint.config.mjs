import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import boundaries from "@rusuh/config/eslint/boundaries";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  ...boundaries,
  {
    settings: { next: { rootDir: "apps/web" } },
  },
  globalIgnores([
    "**/.next/**",
    "**/out/**",
    "**/build/**",
    "**/next-env.d.ts",
    "packages/api/generated/**",
    "apps/web/public/mockServiceWorker.js",
  ]),
]);
