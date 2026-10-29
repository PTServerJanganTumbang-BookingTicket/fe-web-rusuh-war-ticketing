# ADR-0013: Satu aplikasi Next.js dengan modul fitur dan nama file berperan

- **Status**: Proposed
- **Tanggal**: 2026-10-29 (revisi dari 2026-10-28)
- **Pengambil keputusan**: Tim FE Web
- **Requirement terkait**: NFR-08, aturan evaluasi #2 (standar development)
- **Menggantikan**: [ADR-0001](0001-monorepo-structure.md)

## Konteks

ADR-0001 memilih monorepo pnpm (`apps/web`, `packages/{core,api,ui,i18n,config}`, `mocks`) supaya batas lapisan menjadi batas package. Setelah dua minggu berjalan:

- **Hanya ada satu aplikasi.** Tidak ada package yang dipakai konsumen kedua. Mobile memakai payment page lewat WebView (ADR-0008), bukan dengan mengimpor package.
- **Batas package memotong ke arah yang salah.** `core`, `api`, dan `ui` adalah lapisan horizontal, jadi setiap fitur baru menyentuh empat package dan satu folder `features`. Aplikasi ini akan bertambah fitur (login, register, e-tiket, maintenance, admin), dan biaya itu terus berulang.
- **Biaya monorepo nyata, manfaatnya belum.** `transpilePackages`, alias `msw/browser` lewat `../../mocks`, tsconfig per package, dan `@source` Tailwind lintas folder.
- **Penegakan batas tidak butuh package.** `eslint-plugin-boundaries` sudah menjadi penjaga sebenarnya.

Ada dua usulan Clean Architecture yang berjalan bersamaan: branch `refactor/modular-clean-architecture` (modul per fitur) dan branch `init/clean-arch` di repo organisasi (lima lapisan bernama di satu `src/`). Tim memilih struktur modul per fitur, tetapi mengambil dari `init/clean-arch` nama lapisan (`domain`, `data`, `application`, `controllers`, `views`), istilah *protocol* dan *service*, konstanta bisnis terpusat, dan nama file berakhiran peran. Alasannya: versi pertama ADR ini memakai istilah yang sulit dibaca anggota tim baru (`infrastructure`, `presentation`, `platform`, port, adapter, cradle).

## Opsi yang dipertimbangkan

1. **Tetap monorepo, tambah package per fitur.** Pemisahan vertikal, tetapi overhead per package (manifest, tsconfig, transpile) dikalikan jumlah fitur.
2. **Satu aplikasi, folder per lapisan** (`init/clean-arch`: `src/@core/{domain,data,application}`, `src/controllers`). Mudah dipahami, tetapi satu fitur tersebar ke lima folder, dan semua use case menumpuk di satu folder `booking`.
3. **Satu aplikasi, modul per fitur, dan lapisan yang sama di dalam tiap modul** (dipilih). Kode bersama di `src/core` memakai lapisan yang sama, jadi hanya ada satu pola yang perlu dipelajari.

## Keputusan

Opsi 3.

### Struktur

```
src/
├─ app/                 Next.js App Router: routing, layout, route handler
├─ proxy.ts             gerbang edge (Next 16)
├─ instrumentation.ts
├─ di/                  composition root Awilix (ADR-0015)
├─ modules/
│  └─ <modul>/
│     ├─ domain/        model, rules, constants, protocol
│     ├─ application/   use case, <modul>.dependencies.ts
│     ├─ data/          service (HTTP, SSE) dan schema zod
│     ├─ controllers/   hook controller, mapper, query options
│     ├─ views/         <Layar>Container dan View props-only
│     └─ <modul>.module.ts   registrasi DI modul
├─ core/                kode bersama, lapisan sama dengan modul
│  ├─ domain/           AppError, AppConfig, protocol jam/acak/sesi/live updates, util waktu
│  ├─ application/      use case bersama (StartSessionUseCase), core.dependencies.ts
│  ├─ data/             klien HTTP dan SSE, service sesi, jam, acak
│  ├─ controllers/      hook bersama, useDependencies, format tampilan
│  ├─ views/            design-system/ (Signal), ScreenLoading
│  └─ i18n/             pesan Bahasa Indonesia dan t()
├─ mocks/               MSW: handler dan skenario
└─ test/                support test (container uji, server MSW)
```

Modul saat ini: `catalog`, `queue`, `booking`, `payment`, `auth` (placeholder), `ticket` (placeholder). Isi tiap lapisan dan aturan dependensinya ada di [ADR-0014](0014-modular-clean-architecture-solid.md).

### Istilah

| Istilah | Artinya di repo ini | Contoh |
|---|---|---|
| Modul | Satu fitur, satu folder di `src/modules` | `payment` |
| Model | Tipe data domain | `Order` |
| Rules | Fungsi bisnis murni | `canAddTicket`, `isFinalOrder` |
| Protocol | Interface yang dibutuhkan use case. Ditulis di `domain/` | `OrderProtocol` |
| Service | Kelas di `data/` yang mengimplementasikan protocol | `HttpOrderService` |
| Client | Transport tingkat rendah yang dipakai service | `HttpClient`, `EventStreamClient` |
| Schema | Schema zod untuk response BE, dicocokkan ke model | `orderSchema` |
| Use case | Satu aksi aplikasi, kelas dengan satu `execute()` | `StartPaymentUseCase` |
| Controller | Hook React untuk satu layar: state, command, pemetaan ke props | `usePaymentController` |
| Mapper | Fungsi murni dari data domain ke props View | `toPaymentViewProps` |
| Container | Komponen yang memanggil controller lalu memilih View | `PaymentContainer` |
| View | Komponen props-only dari design system | `PaymentView` |
| Registry | Tipe semua yang didaftarkan sebuah modul ke container | `PaymentRegistry` |
| Dependencies | Irisan container yang boleh diminta controller | `PaymentDependencies` |

### Nama file

File non-komponen memakai kebab-case dengan akhiran peran, sehingga peran file terbaca dari namanya. Komponen React tetap PascalCase.

| Akhiran | Lapisan | Isi | Contoh |
|---|---|---|---|
| `.model.ts` | domain | Tipe model | `order.model.ts` |
| `.rules.ts` | domain | Fungsi bisnis murni | `can-add-ticket.rules.ts` |
| `.reducer.ts` | domain | Reducer state | `selection.reducer.ts` |
| `.constants.ts` | domain | Konstanta bisnis dengan rujukan requirement/ADR | `booking.constants.ts` |
| `.protocol.ts` | domain | Interface `<Nama>Protocol` | `order.protocol.ts` |
| `.utils.ts` | domain, controllers, views | Helper murni yang bukan aturan bisnis | `remaining-ms.utils.ts` |
| `.use-case.ts` | application | Kelas `<KataKerja><Benda>UseCase` | `start-payment.use-case.ts` |
| `.dependencies.ts` | application | Tipe `<Modul>Dependencies` | `payment.dependencies.ts` |
| `.service.ts` | data | Kelas `<Teknologi><Nama>Service` | `http-order.service.ts` |
| `.client.ts` | data (core) | Klien transport | `fetch-http.client.ts` |
| `.schema.ts` | data | Schema zod | `order.schema.ts` |
| `.controller.ts` | controllers | Hook `use<Layar>Controller` | `payment.controller.ts` |
| `.mapper.ts` | controllers | Fungsi `to<Layar>ViewProps` | `payment.mapper.ts` |
| `.queries.ts` | controllers | `queryOptions` dan query key | `payment.queries.ts` |
| `.loader.ts` | controllers | Pemuat data untuk Server Component | `home.loader.ts` |
| `.hook.ts` | core/controllers | Hook bersama | `countdown.hook.ts` |
| `.module.ts` | akar modul | Registrasi DI | `payment.module.ts` |
| `.test.ts(x)` | semua | Test, di sebelah file yang dites | `payment.mapper.test.ts` |

`src/app` mengikuti konvensi Next.js (`page.tsx`, `layout.tsx`, `route.ts`). `src/di`, `src/mocks`, dan `src/test` berisi sedikit file dengan satu tugas masing-masing, jadi cukup kebab-case.

pnpm tetap package manager. `pnpm-workspace.yaml` hanya berisi pengaturan pnpm, tanpa `packages:`.

## Konsekuensi

- **Positif**: satu fitur, satu folder. Modul dan `core` punya lapisan yang sama, jadi satu pola cukup untuk dipelajari. Peran file terbaca dari namanya tanpa membuka isinya. Menambah modul tidak menambah manifest atau konfigurasi build. Modul bisa diekstrak utuh karena tidak saling mengimpor.
- **Negatif**: batas tidak lagi didukung resolver package; sepenuhnya bergantung pada ESLint boundaries. Kepemilikan per package di ADR-0001 perlu disepakati ulang per modul. Revisi ini memindahkan 126 file; riwayat tetap bisa diikuti dengan `git log --follow`. Akhiran nama file belum ditegakkan lint dan masih dijaga lewat review.
- **Yang harus dijaga**: `pnpm lint` (boundaries) hijau di CI. Bila suatu saat ada konsumen kedua yang nyata (mis. aplikasi admin terpisah), buat ADR baru untuk mengekstrak modul, `core`, atau `core/views/design-system` menjadi package.
