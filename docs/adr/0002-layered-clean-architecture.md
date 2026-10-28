# ADR-0002: Lapisan Clean Architecture dan aturan dependensi

- **Status**: Superseded by ADR-0014
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
