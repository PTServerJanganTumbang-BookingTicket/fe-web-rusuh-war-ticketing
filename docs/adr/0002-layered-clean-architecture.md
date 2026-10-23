# ADR-0002: Lapisan Clean Architecture dan aturan dependensi

- **Status**: Proposed
- **Tanggal**: 2026-10-18
- **Pengambil keputusan**: Tim FE Web
- **Requirement terkait**: FR-13–19, NFR-02, NFR-04, NFR-07

## Konteks

Bagian paling rawan di FE adalah kuota NIK, timer booking dan pembayaran, serta transisi state booking. Kalau logika ini tersebar di komponen React, ia sulit dites dan mudah rusak saat UI berubah. Logika yang sama juga dipakai di payment page web dan embed mobile.

## Opsi yang dipertimbangkan

1. **Logika di komponen dan hook langsung.** Cepat di awal, mahal di akhir. Test butuh render.
2. **Lapisan dengan aturan dependensi satu arah** (Clean Architecture). Domain murni di tengah, framework di luar.

## Keputusan

Opsi 2, dengan aturan dependensi:

```
apps/web → features → ui, api, i18n → core
```

| Package | Boleh mengimpor | Dilarang |
|---|---|---|
| `core` | `zod` | React, Next, `fetch`, package monorepo lain |
| `api` | `core` | React, `ui`, `features` |
| `ui` | Signal DS, React, `i18n` (tipe saja) | `api`, `features`, `core` (kecuali tipe) |
| `features` | `core`, `api`, `ui`, `i18n`, TanStack Query | `app/` |
| `app/` | `features`, `ui` (layout) | logika bisnis apa pun |

Tambahan:

- **FE tidak pernah memanggil Midtrans.** Semua pembayaran lewat endpoint BE.
- **Error dimodelkan sebagai union bertipe `AppError`** di `core`. `api` memetakan HTTP ke `AppError`, `features` memetakan `AppError` ke key i18n.

## Konsekuensi

- **Positif**: kuota, timer, dan state machine dites dengan Vitest murni dalam hitungan milidetik. Mengganti UI atau transport tidak menyentuh domain.
- **Negatif**: ada sedikit indirection (mapper response ke domain).
- **Yang harus dijaga**: `eslint-plugin-boundaries` (atau dependency-cruiser) di CI. Pelanggaran memblokir merge.

## Catatan implementasi (2026-10-19)

- `ui` boleh `import type` dari `core` dan dilarang mengimpor nilainya. Aturan ini sudah ditegakkan ESLint boundaries (`dependency.kind`).
- `@rusuh/mocks` hanya boleh diimpor dari `features/shared/AppProviders.tsx`, `instrumentation.ts`, dan test (ESLint `no-restricted-imports`).
- `packages/ui` dilarang memuat nilai hex (ESLint). Token desain adalah satu-satunya sumber warna.

## Catatan 2026-10-22: peta layer konseptual

ADR ini mendefinisikan **aturan dependensi antar-package**, bukan lima layer bernama. "Clean" di repo ini berarti dependensi satu arah ke dalam yang ditegakkan ESLint. Package dan layer adalah dua sumbu berbeda; tabel ini menjembataninya.

| Layer konseptual | Lokasi | Catatan |
|---|---|---|
| Domain (entitas, aturan murni, error) | `packages/core/src/{domain,errors,booking,queue,time,payment}` | TypeScript murni |
| Application (use case, port) | `packages/core/src/application` | [ADR-0015](0015-use-case-pure-functions-in-core.md). Boleh mengimpor domain; domain tidak boleh mengimpornya |
| Interface adapter (gateway, mapper) | `packages/api` (HTTP, zod → tipe domain, `AppError`), `apps/web/features/to<Screen>ViewProps` (presenter) | Dua tempat, satu peran: mengubah bentuk data antar batas |
| Controller (logika presentasi) | `apps/web/features/use<Screen>ViewModel`, `features/shared/composition.ts` | [ADR-0003](0003-presentation-pattern-viewmodel-hooks.md). Hook, bukan class |
| Frameworks dan drivers | `packages/ui` (View), `apps/web/app` (routing), `packages/i18n` | |

Hal yang tadinya tidak tertulis:

- **`app` boleh mengimpor `ui` tetapi dilarang mengimpor `core`, `api`, `i18n`.** Alasannya: route hanya merender Container dan layout, sehingga tidak ada tempat bagi logika di `app/`.
- **`AppError` adalah union dengan data terstruktur kecil.** Konsekuensinya error tidak membawa konteks kaya (mis. nama kategori yang stoknya kurang). Konteks itu diambil dari state layar.
- **Status ADR ini masih Proposed** walau aturannya sudah ditegakkan di CI. Perubahan status adalah keputusan tim.

## Catatan 2026-10-22: urutan impor di dalam lapisan

Aturan di atas menjaga arah **antar package**. Di dalam `features`, `ui`, dan `api` ada urutan antar folder yang sebelumnya hanya kebiasaan; sekarang ditegakkan ESLint (`packages/config/eslint/layers.mjs`, `import/no-restricted-paths`). Daftar fitur dan layar dibaca dari disk, jadi folder baru otomatis ikut dijaga.

| Lapisan | Urutan (hanya boleh mengimpor ke kanan) |
|---|---|
| `apps/web/features` | `<fitur>` → `shared`. Fitur tidak saling mengimpor, `shared` tidak mengimpor fitur |
| `packages/ui/src` | `<layar>` → `shared` → `primitives` → `lib`. Layar tidak saling mengimpor |
| `packages/api/src` | `queries`/`queryKeys` → `adapters` → `http` |
| `packages/core/src` | `application` → domain (`domain`, `errors`, `booking`, `queue`, `time`, `payment`) ([ADR-0015](0015-use-case-pure-functions-in-core.md)) |

Sesuatu yang dipakai dua fitur atau dua layar dipindah ke `shared`; jangan saling mengimpor.

Berkas tes unit berada di `__tests__/` pada folder yang diuji. E2E Playwright tetap di `apps/web/e2e/` karena menguji aplikasi utuh.

