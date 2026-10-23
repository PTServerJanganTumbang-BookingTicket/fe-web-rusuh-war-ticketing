import { createRequire } from "node:module";
import path from "node:path";
import type { NextConfig } from "next";

// `msw/browser` mengekspor `node: null`, sehingga gagal di-resolve pada pass SSR komponen client.
// Alias ke file-nya langsung; kode ini hanya dijalankan di browser.
const mswPackage = createRequire(path.join(process.cwd(), "../../mocks/package.json")).resolve("msw/package.json");
// Turbopack hanya menerima pemisah `/`; path.relative di Windows menghasilkan `\`.
const mswBrowser = path.relative(process.cwd(), path.join(path.dirname(mswPackage), "lib/browser/index.js")).split(path.sep).join("/");

const nextConfig: NextConfig = {
  // Satu container image (ADR-0013): server minimal + node_modules hasil tracing di .next/standalone.
  output: "standalone",
  // Tracing dari root monorepo supaya package workspace dan dependensinya ikut terbawa.
  outputFileTracingRoot: path.join(process.cwd(), "../.."),
  poweredByHeader: false,
  // Selalu didefinisikan (kosong bila mati) supaya bundler bisa melipat kondisi mock dan membuang kode mock dari build produksi.
  env: { NEXT_PUBLIC_API_MOCKING: process.env.NEXT_PUBLIC_API_MOCKING ?? "" },
  cacheComponents: true,
  partialPrefetching: true,
  // Package workspace dikonsumsi sebagai source TypeScript.
  transpilePackages: ["@rusuh/core", "@rusuh/api", "@rusuh/ui", "@rusuh/i18n", "@rusuh/mocks"],
  turbopack: {
    resolveAlias: { "msw/browser": `./${mswBrowser}` },
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
