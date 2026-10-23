# ADR-0014: Package manager npm workspaces

- **Status**: Proposed
- **Tanggal**: 2026-10-22
- **Pengambil keputusan**: Tim FE Web
- **Requirement terkait**: — (keputusan tooling)

## Konteks

Repo dimulai dengan pnpm workspace ([ADR-0001](0001-monorepo-structure.md)). ADR-0001 sudah mencatat bahwa pnpm perlu dicek terhadap tech radar perusahaan dan bahwa fallback-nya adalah npm workspaces. Tim memutuskan memakai npm. Perubahan ini menyentuh lockfile, skrip, `Dockerfile` ([ADR-0013](0013-packaging-single-container-image.md)), dan CI.

## Opsi yang dipertimbangkan

1. **Tetap pnpm.** `node_modules` ketat (package hanya melihat dependensi yang dideklarasikan), install cepat. Butuh `corepack` atau langkah instalasi tambahan di mesin dev, CI, dan image build.
2. **npm workspaces.** Terpasang bersama Node, tanpa tooling tambahan di mesin dev, CI, dan image build. Dependensi di-hoist ke satu `node_modules` di root.
3. **Yarn atau Bun.** Tidak dipilih: sama-sama butuh instalasi tambahan dan tidak ada keunggulan yang dibutuhkan repo ini.

## Keputusan

Opsi 2.

- **`package.json` root** memuat `"workspaces": ["apps/*", "packages/*", "mocks"]` dan `"packageManager": "npm@10.9.4"`. Lockfile adalah `package-lock.json`. `pnpm-workspace.yaml` dan `pnpm-lock.yaml` dihapus.
- **Dependensi antar workspace** memakai `"*"` (npm tidak mengenal `workspace:*`). Nama package `@rusuh/*` tetap, jadi tidak ada impor yang berubah.
- **Perintah**: `npm run <skrip>` di root; `npm run <skrip> -w <workspace>` untuk satu workspace; `npm run typecheck --workspaces --if-present` untuk semua.
- **`.npmrc` `ignore-scripts=true`**: sama dengan perilaku sebelumnya (`allowBuilds` pnpm menolak skrip build dependensi). Perintah `npm run ...` tetap jalan.
- **Pengganti kerapatan pnpm**: aturan ESLint `import/no-extraneous-dependencies` per workspace (`packageDir: [".", <workspace>]`). Sebuah workspace hanya boleh mengimpor yang tertulis di `package.json`-nya sendiri atau di devDependencies root (alat bersama seperti `vitest`). Tanpa aturan ini, hoisting membuat impor tanpa deklarasi tetap ter-resolve dan batas package tidak lagi ditegakkan.
- **`@types/node` `^22`** di `apps/web` dan `packages/api`, sesuai Node 22 di CI dan image, dan memenuhi peer `vitest` 5 (`^22 || >=24`). Dengan `^20`, `npm install` menghasilkan lockfile yang ditolak `npm ci`.
- **`Dockerfile`**: stage `deps` men-COPY `.npmrc`, `package-lock.json`, dan `package.json` setiap workspace, lalu `npm ci` dengan cache mount `~/.npm`. Source disalin di stage berikutnya, sehingga layer dependensi tetap di-cache selama manifest dan lockfile tidak berubah.
- **CI**: `actions/setup-node` dengan `cache: npm` dan `npm ci`. Job `image` gagal bila ada workspace yang `package.json`-nya belum di-COPY di `Dockerfile`.

## Konsekuensi

- **Positif**: tidak ada `corepack` atau pnpm di image build dan CI. Satu perintah `npm ci` yang gagal bila lockfile tidak sinkron.
- **Negatif**: `node_modules` hasil hoisting. Aturan ESLint menutup impor tanpa deklarasi untuk nilai, tetapi **tidak** memeriksa `import type`. Contoh: `ui` boleh `import type` dari `@rusuh/core` (ADR-0002), dan akan ter-resolve lewat hoisting walau `@rusuh/core` belum ada di `package.json`-nya. Tambahkan `@rusuh/core` ke `ui` saat pertama dipakai.
- **Negatif**: isi standalone naik dari sekitar 43 MB menjadi sekitar 70 MB. Binary `sharp` (libvips, 46 MB) ikut ter-trace dari `node_modules` hasil hoisting, padahal app tidak memakai `next/image`. Image tetap di bawah batas 300 MB di CI. `outputFileTracingExcludes` per route tidak menghilangkannya (dicoba).
- **Negatif**: versi transitif di-resolve ulang saat migrasi karena npm tidak bisa mengimpor lockfile pnpm. Dari 35 dependensi langsung, 28 versinya sama (termasuk `next` dan `react`). Tujuh berbeda: `@types/node` 20.19.43 → 22.20.5 (disengaja, dua workspace), dan patch atau minor `eslint-plugin-boundaries` 7.2.0 → 7.2.1, `typescript-eslint` 8.71.2 → 8.72.0, `@tanstack/react-query` 5.104.4 → 5.104.5, `lucide-react` 1.59.0 → 1.61.0.
- **Yang harus dijaga**:
  - Workspace baru wajib ditambahkan ke daftar COPY di stage `deps` `Dockerfile` (dicek job `image`).
  - Peer dependency yang bentrok diselesaikan dengan menyelaraskan versi, bukan `legacy-peer-deps`.
  - `package-lock.json` selalu di-commit bersama perubahan `package.json`.

## Pekerjaan lanjutan (belum diputuskan)

- **Mengeluarkan `sharp` dari image** (hemat sekitar 46 MB) bila ukuran image menjadi masalah, mis. dengan menghapus `node_modules/@img` dan `node_modules/sharp` dari output standalone di stage build. Perlu diuji bahwa server tetap berjalan, dan diputuskan bersama bila `next/image` mulai dipakai.
- **Turborepo** tetap menunggu tech radar ([ADR-0001](0001-monorepo-structure.md)).

## Catatan verifikasi (2026-10-22)

- Clean `npm ci` hanya dari manifest (seperti stage `deps`), lalu penyalinan source, `npm run build`, dan penyusunan layout `/app` seperti stage runtime di salinan bersih repo: 595 package terpasang, Home tetap `○` statis, `/api/health` 200 `no-store`, Home 200 dengan `x-nextjs-cache: HIT` dan `data-dpl-id`, CSS 200, `/orders/*/pay` tanpa cookie di-redirect, tidak ada `mockServiceWorker` di chunk client, dan proses keluar saat SIGTERM.
- `docker build` penuh **belum** dijalankan (Docker Hub tidak terjangkau dari lingkungan sesi). Job `image` di CI menjadi verifikasi pertama, termasuk `RUN --mount=type=cache` untuk `npm ci` di `node:22-alpine`.
- Aturan `import/no-extraneous-dependencies` diuji dengan impor `zod` di `ui` dan `clsx` di `core` (keduanya tidak dideklarasikan): ditolak.
