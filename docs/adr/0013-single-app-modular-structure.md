# ADR-0013: Satu aplikasi Next.js dengan modul fitur, bukan monorepo

- **Status**: Proposed
- **Tanggal**: 2026-10-28
- **Pengambil keputusan**: Tim FE Web
- **Requirement terkait**: NFR-08, aturan evaluasi #2 (standar development)
- **Menggantikan**: [ADR-0001](0001-monorepo-structure.md)

## Konteks

ADR-0001 memilih monorepo pnpm (`apps/web`, `packages/{core,api,ui,i18n,config}`, `mocks`) supaya batas lapisan menjadi batas package. Setelah dua minggu berjalan:

- **Hanya ada satu aplikasi.** Tidak ada package yang dipakai konsumen kedua. Mobile memakai payment page lewat WebView (ADR-0008), bukan dengan mengimpor package.
- **Batas package memotong ke arah yang salah.** `core`, `api`, dan `ui` adalah lapisan *horizontal*. Setiap fitur baru menyentuh empat package dan satu folder `features`. Aplikasi ini akan bertambah fitur (login, register, e-tiket, maintenance, admin), jadi biaya itu terus berulang.
- **Biaya monorepo nyata, manfaatnya belum.** `transpilePackages`, alias `msw/browser` yang bergantung pada path `../../mocks`, tsconfig per package, `@source` Tailwind lintas folder, dan Turborepo yang tidak pernah dipasang (menunggu tech radar).
- **Penegakan batas tidak butuh package.** `eslint-plugin-boundaries` sudah menjadi penjaga sebenarnya (ADR-0002); `package.json` per package tidak menegakkan apa pun yang tidak ditegakkan lint.

Aplikasi ini harus diasumsikan **berkembang**: lebih banyak modul, lebih banyak tim, kemungkinan modul dipindah ke repo atau aplikasi lain.

## Opsi yang dipertimbangkan

1. **Tetap monorepo, tambah package per fitur** (`packages/booking`, `packages/payment`, ...). Pemisahan vertikal, tetapi overhead per package (manifest, tsconfig, transpile) dikalikan jumlah fitur.
2. **Satu aplikasi, folder per lapisan horizontal** (`src/domain`, `src/infrastructure`, `src/ui`). Sederhana, tetapi fitur tetap tersebar ke banyak folder dan tidak ada unit yang bisa dipindah utuh.
3. **Satu aplikasi, modul fitur vertikal dengan lapisan Clean Architecture di dalam tiap modul** (dipilih). `src/modules/<modul>/{domain,application,infrastructure,presentation}`, ditambah kode bersama yang dipisah per sifatnya (`src/core`, `src/platform`, `src/ui`) dan composition root `src/di`.

## Keputusan

Opsi 3. Struktur:

```
src/
├─ app/            Next.js App Router: routing, layout, route handler (lapisan framework)
├─ proxy.ts        gerbang edge (Next 16)
├─ instrumentation.ts
├─ di/             composition root: container Awilix, config, AppProviders (ADR-0015)
├─ modules/
│  └─ <modul>/
│     ├─ domain/          entitas, value object, aturan murni
│     ├─ application/     use case + port (interface)
│     ├─ infrastructure/  adapter yang mengimplementasikan port (HTTP, zod)
│     ├─ presentation/    ViewModel hook, mapper, Container, query options
│     │  └─ views/        View props-only
│     └─ <modul>.module.ts  registrasi DI modul
├─ core/           kernel murni bersama: domain/ + application/ (tanpa React, zod, awilix)
├─ platform/       adapter bersama: HTTP, SSE, sesi/cookie, jam dan acak sistem
├─ ui/             presentation bersama: design-system/ (Signal), i18n/, hooks/, di/ (useCradle)
├─ mocks/          MSW: handler dan skenario
└─ test/           support test (container uji, server MSW)
```

Modul saat ini: `catalog`, `queue`, `booking`, `payment`, `auth` (placeholder), `ticket` (placeholder). Aturan lapisan dan dependensi ada di [ADR-0014](0014-modular-clean-architecture-solid.md).

pnpm tetap dipakai sebagai package manager. `pnpm-workspace.yaml` hanya berisi pengaturan pnpm (`allowBuilds`), tanpa `packages:`.

## Konsekuensi

- **Positif**: satu fitur = satu folder. Menambah modul tidak menambah manifest atau konfigurasi build. Modul bisa diekstrak utuh ke package atau aplikasi lain nanti karena tidak saling mengimpor. Konfigurasi Next, Tailwind, Vitest, dan MSW menjadi lebih pendek (tanpa `transpilePackages`, `@source` lintas folder, atau path `../../mocks`).
- **Negatif**: batas tidak lagi didukung resolver package; sepenuhnya bergantung pada ESLint boundaries. Kepemilikan per package (Muzaki: `core`/`api`, Akbar: `ui`) berubah menjadi kepemilikan per modul atau per lapisan, perlu disepakati ulang. Riwayat git berpindah path (dipindah dengan `git mv`, `git log --follow` tetap jalan).
- **Yang harus dijaga**: `pnpm lint` (boundaries) wajib hijau di CI. Bila suatu saat ada konsumen kedua yang nyata (mis. aplikasi admin terpisah), buat ADR baru untuk mengekstrak modul, `core`, atau `ui/design-system` menjadi package.
