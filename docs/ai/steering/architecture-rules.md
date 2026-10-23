# Aturan Arsitektur

Ringkasan untuk agent dari [overview](../../architecture/overview.md) dan ADR 0001–0015. Detail dan alasan ada di ADR.

## Aturan dependensi (wajib)

```
apps/web/app → apps/web/features → packages/{ui, api, i18n} → packages/core
```

| Lokasi | Boleh | Dilarang |
|---|---|---|
| `packages/core` | TypeScript murni, `zod`. Di dalamnya: `application/` (use case, port) boleh mengimpor domain | React, Next, `fetch`, `window`, `Date.now()` langsung (pakai parameter `now`), import package lain. Domain (`domain`, `errors`, `booking`, `queue`, `time`, `payment`) tidak boleh mengimpor `application/` |
| `packages/api` | `core`, client HTTP, TanStack Query hooks | React component, `ui`, `features` |
| `packages/ui` | React, Signal DS, Tailwind | Fetch data, hook TanStack Query, import `api` atau `features` |
| `apps/web/features` | `core`, `api`, `ui`, `i18n` | Logika bisnis yang belum ada di `core`. Memanggil `startPayment`/`startSession` langsung (pakai `application` dari `shared/composition.ts`) |
| `apps/web/app` | Render Container dari `features`, layout | Logika apa pun selain komposisi |

## Larangan keras

- **Jangan membuat class ViewModel, lifecycle buatan, atau Provider per layar.** ViewModel adalah custom hook `use<Screen>ViewModel` (ADR-0003).
- **Jangan menaruh orkestrasi atau aturan bisnis di ViewModel.** Command yang punya aturan atau merangkai langkah adalah use case di `core/application` (fungsi murni, port sebagai tipe fungsi, tanpa class atau container DI), disambungkan di `features/shared/composition.ts` (ADR-0015).
- **Jangan menyimpan server state di Context atau global store.** Pakai TanStack Query (ADR-0004).
- **Jangan menghitung countdown dari durasi.** Selalu dari `expiresAt` + offset server, lewat `core/time` (ADR-0005).
- **Jangan memutuskan expired di klien.** Saat timer nol, panggil endpoint status, ikuti jawabannya (ADR-0005).
- **Jangan memanggil Midtrans atau mengimpor SDK-nya.** Pembayaran hanya lewat endpoint BE (ADR-0006).
- **Jangan menaruh token di URL**, kecuali one-time code di alur exchange WebView (ADR-0008).
- **Jangan memasang provider client di root layout.** Home harus tetap statis (ADR-0007).
- **Jangan mengedit `packages/api/generated/`.** Regenerate dari OpenAPI (ADR-0009).

## Aturan tambahan (ditegakkan lint atau CI)

- **`ui` memakai primitif dan token Signal DS (ADR-0012).** Tidak ada nilai hex di `packages/ui` (`bg-primary`, `text-muted-foreground`, `bg-signal-bg-error`, `currentColor`). Tombol, kartu, badge, alert, progress, dan radio dibangun dari `packages/ui/src/primitives`. Hex ditegakkan ESLint.
- **`ui` boleh `import type` dari `core`, bukan nilai.** Ditegakkan ESLint boundaries (ADR-0002).
- **Kode mock hanya dimuat dari `features/shared/AppProviders.tsx`, `instrumentation.ts`, dan test.** Pemuatannya dijaga `NEXT_PUBLIC_API_MOCKING`. `next.config.ts` selalu mendefinisikan variabel itu supaya kode mock hilang dari bundle produksi. Ditegakkan ESLint dan dicek lewat ukuran bundle.
- **Kontrol yang hanya untuk simulasi** (mis. tombol "Simulasikan berhasil/gagal") dirender hanya saat `NEXT_PUBLIC_API_MOCKING=enabled`.
- **Home tetap statis.** CI gagal bila `/` bukan route statis (ADR-0007).
- **Flag `NEXT_PUBLIC_*` baru wajib ditambahkan sebagai `ARG` dan `ENV` di `Dockerfile`**, karena nilainya di-inline saat build. CI gagal bila ada variabel di `apps/web/.env.example` yang tidak ada di `Dockerfile` (ADR-0013).
- **Build tidak boleh mengunduh aset dari internet** selain registry paket (mis. `next/font/google`). Font dan aset di-self-host agar image bisa dibangun di jaringan tertutup (ADR-0013).
- **Urutan impor di dalam lapisan** (ESLint `layers.mjs`, ADR-0002): fitur di `features` tidak saling mengimpor dan `shared` tidak mengimpor fitur; `ui` berurutan `layar → shared → primitives → lib` tanpa layar saling mengimpor; `api` berurutan `queries → adapters → http`. Yang dipakai bersama ditaruh di `shared`.
- **Nama dan umur cookie sesi** hanya didefinisikan di `features/shared/session.ts`; route handler dan `proxy.ts` mengimpornya, jangan menulis ulang string `access_token`.
- **Test unit ada di `__tests__/` pada folder yang diuji** (bukan di samping file). E2E di `apps/web/e2e/`.
- **Setiap workspace hanya mengimpor dependensi yang tertulis di `package.json`-nya sendiri** (atau devDependencies root untuk alat bersama). npm menghoist semua package, jadi aturan ESLint `import/no-extraneous-dependencies` yang menjaganya. `import type` tidak diperiksa (ADR-0014).
- **Package manager adalah npm.** Jangan menambah `pnpm-lock.yaml`, `yarn.lock`, atau `workspace:*`. Dependensi antar workspace memakai `"*"`. Commit `package-lock.json` bersama perubahan `package.json`, dan selesaikan peer dependency yang bentrok dengan menyelaraskan versi, bukan `legacy-peer-deps`.
- **Workspace baru wajib ditambahkan ke daftar `COPY .../package.json` di stage `deps` `Dockerfile`**, karena `npm ci` hanya melihat manifest yang disalin. CI gagal bila lupa (ADR-0014).

## Pola wajib per layar

Mengikuti ADR-0017 (screen model, Proposed); kode sudah memakainya sejak tahap 3 rencana implementasi.

```
features/<feature>/
├─ <screen>Model.ts            type <Screen>ScreenState (union) + derive<Screen>ScreenState(input): murni, tanpa i18n
├─ use<Screen>ViewModel.ts     hanya hook (query, mutation, countdown, router) → { state, actions }; tanpa @rusuh/i18n (lint)
├─ to<Screen>ViewProps.ts      fungsi murni (state, actions) → props View: i18n, format, pesan galat, state tombol
├─ <Screen>Container.tsx       render View dari to<Screen>ViewProps(use<Screen>ViewModel(...))
└─ __tests__/                  satu test per file di atas (kecuali Container)
packages/ui/src/<screen>/
└─ <Screen>View.tsx            props-only, semua state visual punya story
packages/core/src/application/
└─ <useCase>.ts                hanya bila command punya aturan/langkah; port baru di ports.ts, sambung di features/shared/composition.ts
packages/api/src/
├─ contracts/<resource>.ts     schema zod DTO (cermin OpenAPI), ditandai KONTRAK-ASUMSI sampai final
└─ mappers/<resource>.ts       DTO → domain dan domain → request body; satu-satunya yang tahu nama field BE
```

## Letak dan nama file

Peran file ditentukan **folder** dan **pola nama**, bukan akhiran seperti `.usecase.ts` atau `.model.ts`: aturan lint lapisan (`boundaries.mjs`, `layers.mjs`) sudah membaca folder, dan akhiran hanya mengulang informasi yang sama. Ditegakkan oleh `packages/config/conventions/fileConventions.test.ts` (bagian dari `npm test`).

| Peran | Letak | Nama file | Isi wajib |
|---|---|---|---|
| Tipe domain | `core/src/domain/` | `<konsep>.ts` | tipe, tanpa logika |
| Aturan domain | `core/src/<area>/` (`booking`, `queue`, `payment`, `time`, `auth`, `errors`) | `<aturan>.ts` (`canAddTicket.ts`) | fungsi murni, `now` sebagai parameter |
| Use case | `core/src/application/` | `<kataKerjaObjek>.ts` (`registerAccount.ts`) | `<UseCase>Deps` + fungsi `(deps, ...input)` |
| Port | `core/src/application/ports.ts` | satu file | tipe fungsi `PascalCase` |
| Contract | `api/src/contracts/` | `<resource>.ts` | schema zod + tipe `*Dto` |
| Mapper DTO | `api/src/mappers/` | `<resource>.ts`, berpasangan dengan contract | fungsi `to<Domain>` / `to<X>Request` |
| Adapter | `api/src/adapters/` | `<resource>.ts` | `apiFetch` + contract + mapper |
| Screen model | `features/<fitur>/` | `<screen>Model.ts` | `<Screen>ScreenState` + `derive<Screen>ScreenState` |
| ViewModel | `features/<fitur>/` | `use<Screen>ViewModel.ts` | `export type <Screen>ViewModel` |
| Mapper ke View | `features/<fitur>/` | `to<Screen>ViewProps.ts` atau `to<Komponen>Props.ts` | fungsi murni |
| Container | `features/<fitur>/` | `<Screen>Container.tsx` | tanpa logika |
| Loader Server Component | `features/<fitur>/` | `load<Screen>.ts` | hanya Home (ADR-0007) |
| Bersama lintas fitur | `features/shared/` | bebas, camelCase/PascalCase | tidak mengimpor fitur |
| View | `ui/src/<screen>/` | `<Screen>View.tsx` | props-only |

- Satu folder fitur boleh berisi beberapa layar (mis. `auth`: login, registrasi, callback, verifikasi), masing-masing dengan set file lengkapnya.
- File lain di folder fitur (helper, util, subfolder) ditolak test: pindahkan ke `features/shared`, `core`, atau `ui`.
- Test unit: satu file test per file sumber, di `__tests__/` folder sumbernya, bernama `<sumber>.test.ts(x)`. Helper bersama hanya `__tests__/support.ts(x)`. Wajib ada untuk use case, adapter, mapper DTO, screen model, mapper ke View, dan ViewModel.

## Pengecualian terdokumentasi

| Pengecualian | Alasan | Dicatat di |
|---|---|---|
| Home memakai Container async (Server Component), tanpa hook ViewModel | Hook memaksa Client Component dan merusak render statis | ADR-0003 |
| `proxy.ts`, bukan `middleware.ts` | Konvensi Next 16 | ADR-0007 |
| `/api/session/start` (web) terpisah dari `/api/session/exchange` (WebView) | Kontrak berbeda | ADR-0008 |
| Halaman dengan `params` membungkus isinya dalam `<Suspense>`, dan layout route memasang `AppProviders` | Cache Components Next 16 menuntut akses `params` di dalam Suspense | ADR-0007 |
| Token link login sekali pakai di URL `/auth/callback?token=` | Link dari email tidak punya cara lain membawa token. Token sekali pakai, dihapus dari URL dan riwayat sebelum ditukar, dan tidak disimpan FE | Figma SJT ZAKI (Login); perlu ADR saat kontrak auth final |

## Error

- `api` memetakan response gagal ke `AppError` (union bertipe di `core/errors`).
- ViewModel memetakan `AppError` ke key i18n dan state layar.
- Komponen tidak pernah menampilkan `error.message` mentah.

## Jika ragu

Kalau sebuah perubahan butuh melanggar aturan di atas, berhenti dan usulkan ADR baru lewat skill [`write-adr`](../skills/write-adr/SKILL.md).
