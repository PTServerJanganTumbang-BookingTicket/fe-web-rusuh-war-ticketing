import { createRequire } from "node:module";
import path from "node:path";
import type { NextConfig } from "next";

// `msw/browser` mengekspor `node: null`, sehingga gagal di-resolve pada pass SSR komponen client.
// Alias ke file-nya langsung; kode ini hanya dijalankan di browser.
const mswPackage = createRequire(path.join(process.cwd(), "package.json")).resolve("msw/package.json");
// Turbopack hanya menerima pemisah `/`; path.relative di Windows menghasilkan `\`.
const mswBrowser = path
  .relative(process.cwd(), path.join(path.dirname(mswPackage), "lib/browser/index.js"))
  .split(path.sep)
  .join("/");

const nextConfig: NextConfig = {
  // Satu container image (ADR-0021): server minimal + node_modules hasil tracing di .next/standalone.
  output: "standalone",
  poweredByHeader: false,
  // Selalu didefinisikan (kosong bila mati) supaya bundler bisa melipat kondisi mock dan membuang kode mock dari build produksi.
  env: { NEXT_PUBLIC_API_MOCKING: process.env.NEXT_PUBLIC_API_MOCKING ?? "" },
  cacheComponents: true,
  partialPrefetching: true,
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
