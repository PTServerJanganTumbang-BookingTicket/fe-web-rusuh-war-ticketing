# ADR-0017: Screen model terpisah dari props View, dan lapisan contract + mapper di `api`

- **Status**: Proposed
- **Tanggal**: 2026-10-22
- **Pengambil keputusan**: Tim FE Web
- **Requirement terkait**: NFR-01, NFR-02, FR-01–25, [ADR-0002](0002-layered-clean-architecture.md), [ADR-0003](0003-presentation-pattern-viewmodel-hooks.md), [ADR-0009](0009-contract-first-openapi-msw.md), [ADR-0015](0015-use-case-pure-functions-in-core.md)

## Konteks

Ada dua masalah yang muncul setelah tiga layar dibangun (Waiting Room, Detail Ticket, Payment).

**ViewModel sulit dibaca.** ADR-0003 mengizinkan ViewModel mengembalikan union layar `{ kind, view }` dengan `view` berupa props View yang sudah jadi. Akibatnya satu hook memuat wiring TanStack Query, keputusan kondisi layar (loading, error, expired, siap), dan pembentukan props berisi string i18n. Kondisi layar tidak tertulis sebagai tipe, hanya tersirat dari urutan `if`. Test ViewModel memeriksa string terjemahan, bukan kondisi. Bentuk return juga berbeda antar layar: Queue mengembalikan props View langsung, Booking dan Payment mengembalikan union.

**Kontrak BE belum final, tetapi bentuknya sudah tertanam di `core`.** Adapter di `api` mem-parse response dengan zod dan langsung mengembalikannya sebagai tipe domain. Tipe domain di `core` dengan demikian identik dengan JSON BE. Bila BE mengganti nama atau struktur field, perubahannya merembet ke `core`, mapper `to<Screen>ViewProps`, test, dan handler MSW. Tim perlu menyelesaikan semua alur (lihat [rencana implementasi](../architecture/implementation-plan.md)) sebelum kontrak final, jadi biaya perubahan kontrak harus dikurung di satu tempat.

## Opsi yang dipertimbangkan

1. **Opsi A: Biarkan pola sekarang, tambah disiplin review.** Tanpa file baru. Kekurangan: masalah keterbacaan tetap, dan perubahan kontrak tetap merembet ke semua lapisan.
2. **Opsi B: Pindahkan semua kondisi layar ke state machine di `core`.** Satu sumber kebenaran untuk web dan mobile. Kekurangan: kondisi yang murni UI (loading query, error jaringan, mode redirect) ikut masuk domain, dan `core` mulai tahu status TanStack Query.
3. **Opsi C: Screen model di `features`, state machine di `core` hanya untuk alur yang punya aturan, dan contract + mapper di `api`.** Kekurangan: dua file tambahan per layar (`<screen>Model.ts`) dan per resource (`contracts/`, `mappers/`).

## Keputusan

Opsi C.

### Presentasi

1. **Setiap layar punya `features/<feature>/<screen>Model.ts`** berisi `type <Screen>ScreenState` (discriminated union berisi data domain, tanpa string i18n) dan fungsi murni `derive<Screen>ScreenState(input)` yang menurunkannya dari status query, data domain, dan sisa waktu.
2. **`use<Screen>ViewModel` hanya berisi hook** (query, mutation, countdown, router) dan mengembalikan `{ state, actions }`. Tidak ada `t()` di ViewModel.
3. **`to<Screen>ViewProps(state, actions)`** mengubah state menjadi props View: i18n, format, state tombol. Container memanggilnya dan memilih View sesuai `state.kind`.
4. **State machine di `core/<domain>/machine.ts` hanya untuk alur yang punya aturan transisi** (booking dan payment, sesuai [overview §5](../architecture/overview.md#5-state-machine-booking-fe)). Kondisi murni UI tetap di screen model.
5. Pengecualian Home tetap (ADR-0003, ADR-0007): tanpa hook, polanya `loadHome()` (di `loadHome.ts`, memegang cache dan mengembalikan `HomeScreenState`) lalu `toHomeViewProps()`.

Ini menggantikan butir catatan implementasi ADR-0003 tentang "ViewModel boleh mengembalikan union layar" dengan union yang berisi state, bukan props View. Isi ADR-0003 tidak diubah.

### Kontrak

6. **`api/contracts/<resource>.ts`** berisi schema zod DTO yang mencerminkan OpenAPI. Saat kontrak final, isinya diganti schema hasil generate (ADR-0009).
7. **`api/mappers/<resource>.ts`** mengubah DTO menjadi tipe domain (dan domain menjadi request body). Hanya file ini yang tahu nama field BE.
8. **Adapter** merangkai `apiFetch` + contract + mapper dan tetap memenuhi port di `core/application/ports.ts`.
9. **Handler MSW** di `mocks` memakai tipe `z.input` dari contract yang sama, supaya mock tidak bisa melenceng dari kontrak tanpa gagal typecheck.
10. **Asumsi kontrak ditandai** `// KONTRAK-ASUMSI: <METHOD path>` dan dilacak di `docs/architecture/contracts.md`.

## Konsekuensi

- **Positif**: Kondisi layar terbaca sebagai tipe di satu file. `derive` dan mapper dites tanpa render; test ViewModel memeriksa `state.kind`, bukan teks. Perubahan kontrak BE berhenti di `contracts/` dan `mappers/`; domain, use case, ViewModel, dan View tidak tersentuh kecuali semantiknya berubah. Test mapper dengan fixture BE menjadi contract test.
- **Negatif / biaya**: Satu file tambahan per layar dan dua folder tambahan per resource. Ada pemetaan DTO → domain yang tampak duplikatif selama nama field masih sama. Refactor tiga layar yang ada (Queue, Booking, Payment) dan Home harus dilakukan sebelum layar baru dibangun, agar pola tidak bercampur.
- **Yang harus dijaga**:
  - ESLint `packages/config/eslint/layers.mjs`: zona baru `contracts ← mappers ← adapters ← queries` di `api`.
  - ESLint: `features/**/use*ViewModel.ts` tidak mengimpor `@rusuh/i18n` (ditambahkan saat ADR ini Accepted).
  - Review: `core` tidak mengimpor dari `api/contracts`; tipe domain tidak diturunkan dari schema DTO (`z.infer`).
  - Saat Accepted: perbarui `docs/ai/steering/architecture-rules.md` (pola wajib per layar), `coding-conventions.md` (penamaan `<screen>Model`, `<Screen>ScreenState`, `derive<Screen>ScreenState`; akhiran `Screen` membedakannya dari tipe domain seperti `QueueState`), skill `new-feature-screen` dan `sync-api-contract`.
