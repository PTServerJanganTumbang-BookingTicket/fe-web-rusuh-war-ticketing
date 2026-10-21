# ADR-0001: Monorepo dengan pemisahan core / ui / api

- **Status**: Proposed
- **Tanggal**: 2026-10-18
- **Pengambil keputusan**: Tim FE Web (Ahmad Muzaki, Akbar T Hartomo)
- **Requirement terkait**: NFR-08, aturan evaluasi #2 (standar development)

## Konteks

Klien meminta pembagian kasar "core, ui, dan lainnya". Payment page harus dipakai ulang di mobile. Dua developer FE bekerja paralel dan butuh batas kepemilikan yang jelas.

## Opsi yang dipertimbangkan

1. **Satu aplikasi Next.js dengan folder biasa.** Paling sederhana, tetapi batas antar lapisan hanya konvensi dan mudah dilanggar.
2. **Monorepo workspace (pnpm + Turborepo) dengan package terpisah.** Batas lapisan menjadi batas package, dependensi eksplisit di `package.json`, build dan test bisa di-cache per package.
3. **Polyrepo.** Isolasi maksimal, tetapi overhead versioning terlalu besar untuk tim 2 orang.

## Keputusan

Opsi 2. Struktur:

- `packages/core`: domain murni.
- `packages/ui`: komponen presentasional di atas Signal DS.
- `packages/api`: client HTTP dan adapter.
- `packages/i18n`, `packages/config`: pendukung.
- `apps/web`: aplikasi Next.js.
- `mocks/`: MSW.

## Konsekuensi

- **Positif**: batas lapisan ditegakkan oleh package boundary. Kepemilikan jelas (Muzaki: `core`, `api`; Akbar: `ui`). Turborepo meng-cache lint, test, dan build.
- **Negatif**: setup awal sedikit lebih panjang (sekitar setengah hari).
- **Yang harus dijaga**: package hanya boleh bergantung sesuai [ADR-0002](0002-layered-clean-architecture.md). pnpm dan Turborepo perlu dicek terhadap tech radar perusahaan. Kalau tidak tercantum, fallback ke npm workspaces.

## Catatan implementasi (2026-10-19)

- Yang terpasang baru **pnpm workspace** (`apps/*`, `packages/*`, `mocks`). Turborepo belum dipasang sampai tech radar dicek.
- `mocks/` berupa package `@rusuh/mocks` agar dependensi `msw` terisolasi dan bisa diimpor `api` (test) dan `apps/web` (dev server).

