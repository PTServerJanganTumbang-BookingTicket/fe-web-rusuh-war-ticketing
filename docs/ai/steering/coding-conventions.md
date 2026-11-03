# Konvensi Kode

## Bahasa dan tipe

- TypeScript `strict: true`, `noUncheckedIndexedAccess: true`. Tidak ada `any`. Gunakan `unknown` lalu parse.
- Tipe domain di `domain` memakai discriminated union untuk state (`{ status: 'held'; expiresAt: string } | ...`).

## Penamaan

Nama file non-komponen: kebab-case dengan akhiran peran (ADR-0013). Komponen React: PascalCase.

| Hal | File | Simbol | Contoh |
|---|---|---|---|
| Model | `<konsep>.model.ts` | Tipe PascalCase | `order.model.ts` → `Order` |
| Aturan bisnis murni | `<konsep>.rules.ts` | Fungsi camelCase | `can-add-ticket.rules.ts` → `canAddTicket` |
| Reducer | `<konsep>.reducer.ts` | `<konsep>Reducer`, event `SCREAMING_SNAKE` di `type` | `selectionReducer`, `{ type: 'ADD_TICKET' }` |
| Konstanta bisnis | `<m>.constants.ts` | `SCREAMING_SNAKE`, satuan di akhir (`_MS`, `_SECONDS`) | `MAX_TICKETS_PER_NIK`, `STOCK_REFRESH_INTERVAL_MS` |
| Protocol | `<nama>.protocol.ts` | `<Nama>Protocol`, tanpa awalan `I` | `OrderProtocol`, `ClockProtocol` |
| Use case | `<kata-kerja>-<benda>.use-case.ts` | Factory `create<KataKerja><Benda>UseCase`, tipe `<KataKerja><Benda>UseCase` | `createStartPaymentUseCase` |
| Irisan dependensi controller | `<m>.dependencies.ts` | `<M>Dependencies` | `PaymentDependencies` |
| Service | `<teknologi>-<nama>.service.ts` | Factory `create<Teknologi><Nama>Service` | `http-order.service.ts` → `createHttpOrderService` |
| Client transport | `<teknologi>-<nama>.client.ts` | Interface `<Nama>Client`, kelas `<Teknologi><Nama>Client` | `HttpClient`, `FetchHttpClient` |
| Schema zod | `<nama>.schema.ts` | `<nama>Schema` | `orderSchema` |
| Helper murni | `<nama>.utils.ts` | Fungsi camelCase | `remaining-ms.utils.ts` → `remainingMs` |
| Controller | `<m>.controller.ts` | Hook `use<Layar>Controller` | `usePaymentController` |
| Mapper ke props View | `<m>.mapper.ts` | `to<Layar>ViewProps` (murni) | `toPaymentViewProps` |
| Query options | `<m>.queries.ts` | Factory `<m>Keys`, key diawali nama modul | `queueKeys.position(eventId)` |
| Loader Server Component | `<layar>.loader.ts` | `load<Layar>ViewProps` | `loadHomeViewProps` |
| Hook bersama | `<nama>.hook.ts` (di `core/controllers`) | `use<Nama>` | `countdown.hook.ts` → `useCountdown` |
| Container | `<Layar>Container.tsx` | Komponen | `PaymentContainer` |
| View | `<Layar>View.tsx` | Komponen | `PaymentView` |
| Registrasi modul | `<m>.module.ts` | `<m>Module()` dan `type <M>Registry` | `paymentModule`, `PaymentRegistry` |
| Nama registrasi container | - | Use case `<x>UseCase`; protocol `<x>Service`; sisanya kata benda pendek | `startPaymentUseCase`, `orderService`, `clock` |
| Test | `<file>.test.ts(x)` di sebelah file | - | `payment.mapper.test.ts` |
| Helper test yang bukan hook | - | Awalan `setup`, bukan `use` (lint `rules-of-hooks`) | `setupMockServer` |
| Folder modul | camelCase, kata benda bounded context | - | `catalog`, `booking`, `payment` |
| Flag build | `NEXT_PUBLIC_<NAMA>` di `.env.example` | - | `NEXT_PUBLIC_BOOKING_EXPIRY` |
| Key i18n | `feature.context.message` | - | `booking.quota.exceeded` |

## Komponen

- Komponen design system (`src/core/views/design-system`) dan view modul memakai komponen Signal DS sebagai dasar. Tailwind hanya untuk layout dan spacing yang tidak disediakan Signal.
- Token warna dan tipografi diambil dari preset Signal, bukan nilai hex langsung.
- Komponen fungsi saja (tanpa class). Satu-satunya pengecualian adalah error boundary, karena React belum menyediakan versi hook.
- Props komponen primitif memperluas atribut HTML bawaan (`React.ComponentProps<"button">`) dan meneruskan `...rest` ke elemen akar.
- Dialog dan popup memakai primitif Radix `Dialog` (Escape menutup, `aria-modal`, jebakan fokus, kunci scroll, fokus kembali ke pemicu). Jangan membuat ulang secara manual.
- Setiap komponen interaktif bisa dioperasikan dengan keyboard dan punya label aksesibel. Countdown: elemen `role="timer"` dengan `aria-live="off"` agar tidak diumumkan tiap detik. Pengumuman lewat live region terpisah: peringatan 60 detik memakai `assertive`. Pengingat berkala (`polite`) belum ada dan perlu diputuskan bersama tim aksesibilitas.

## Token desain

- Warna, radius, dan tipografi lewat token Signal DS: `bg-primary`, `text-muted-foreground`, `border`, `bg-signal-bg-valid`, `text-signal-error`, `bg-brand`. Nilainya ada di satu tempat, `src/core/views/design-system/signal.css` (ADR-0012).
- Tipografi memakai kelas skala Signal: `type-h1`…`type-h6` (Telkomsel Batik Sans) dan `type-title`, `type-body1`, `type-body2` (Poppins), bukan ukuran font ad hoc.
- Tidak ada hex, `rgb()`, atau nama warna Tailwind mentah (`violet-700`) di `src/core/views` dan `src/modules/<m>/views`.
- Elemen interaktif dan wadah dibangun dari primitif (`Button`, `Badge`, `Card`, `Alert`, `Progress`, `RadioGroup`). Varian Signal baru ditambahkan ke primitif, bukan ditulis ulang di view.
- Wireframe adalah referensi struktur dan isi, **bukan** desain visual. Target visual adalah Telkomsel Signal DS.

## Aksesibilitas

- Pakai elemen semantik (`<button>`, `<nav>`, `<main>`), bukan `<div onClick>`. ESLint menegakkan `click-events-have-key-events`, `no-static-element-interactions`, `label-has-associated-control`, dan `anchor-is-valid`.
- Gambar punya `alt`; gambar dekoratif memakai `alt=""`.
- Input punya label. Pesan galat dihubungkan ke input lewat `aria-describedby`.
- Target sentuh minimal 44x44px (payment page dipakai di WebView mobile). Primitif `Button` ukuran `lg` setinggi 48px.
- Status memuat memakai `role="status"`.

## Controller

- Kepala file mencantumkan ID requirement dan nomor wireframe yang dipenuhi.
- Mengembalikan union layar (`{ kind: 'ready' | 'status' | 'result', view }`) bila layar punya beberapa tampilan, supaya Container tinggal memilih View.

## Kode

- Tidak ada ternary bersarang. Ekstrak ke fungsi, lookup object, atau early return (`no-nested-ternary`).
- Satu `import` per modul; tipe boleh terpisah (`import type`) atau inline (`no-duplicate-imports`).
- Tidak ada kode mati, kode yang dikomentari, atau import tak terpakai.
- Bersihkan listener, timer, `AbortController`, dan subscription saat unmount (polling antrian dan countdown rawan bocor).
- Tidak ada nilai yang seharusnya konfigurasi di-hardcode. Env var lewat `NEXT_PUBLIC_*` dan didaftarkan di `.env.example`.
- Fungsi dengan lebih dari 3 parameter memakai satu objek parameter.
- `@ts-ignore` dilarang. `@ts-expect-error` wajib disertai alasan (minimal 10 karakter).
- `eslint-disable` wajib disertai komentar alasan. Jangan melewati hook dengan `--no-verify`.
- `TODO` dan `FIXME` menyertakan rujukan issue.
- Kode yang ditulis atau diedit AI harus sudah lolos lint saat ditulis, bukan diperbaiki saat commit.
- Font lewat `next/font` (self-hosted saat build). Tidak ada `<link>` ke CDN font saat runtime.
- Perhitungan countdown dan kedaluwarsa hanya lewat `src/core/domain/time` dengan `now` dan offset server (ADR-0005). `new Date(...)` boleh untuk memformat tanggal tampilan, bukan untuk menghitung sisa waktu.

- Fungsi di `domain` murni dan menerima `now` sebagai parameter bila butuh waktu. Di controller, jam diambil dari `clock` di container, acak dari `random`.

## Factory, use case, dan DI (ADR-0014, ADR-0015)

- Use case dan service adalah fungsi dari factory. Kelas hanya untuk client transport (`FetchHttpClient`, `EventSourceStreamClient`) dan `AppFailure`. Komponen dan controller tetap fungsi.
- Factory menerima satu objek dependensi: `createStartPaymentUseCase({ orderService }: { orderService: OrderProtocol })`. Tidak ada parameter posisi (Awilix mode PROXY).
- Dependensi bertipe protocol (interface), bukan implementasi service.
- Use case dan service tidak menangkap error; biarkan `AppFailure` naik ke controller.
- Tidak ada `import` dari `awilix` di luar `src/di` dan `*.module.ts`.
- Impor di dalam satu modul memakai path relatif; impor ke `core`, `di`, atau dari `app` memakai alias `@/`.
- Tidak ada `console.*` di kode yang di-commit (`no-console`). Logger (protocol di `core/domain`) direncanakan tetapi belum ada; sampai ada, jangan mencetak log.
- Komentar menjelaskan *mengapa*, bukan *apa*.
- Tidak ada abstraksi untuk satu pemakaian. Ekstrak setelah dipakai di tempat ketiga.

## Git

- Format commit Telkomsel: `[JIRAID][ACTOR] <type>(<scope>): <deskripsi>`, misalnya `[SJT-102][Agus] feat(booking): add ticket selection`. Jika tidak ada tiket, pakai `[NO-JIRA]`. Scope wajib. Detail di `.kiro/steering/commit-conventions.md`.
- Hook lokal (Husky): `pre-commit` menjalankan lint-staged (Prettier, ESLint `--max-warnings=0`, dan test terkait via `vitest related` untuk file yang di-stage); `commit-msg` menjalankan commitlint (`commitlint.config.mjs`, termasuk larangan trailer atribusi). CI menjalankan commitlint ulang pada PR, judul PR, dan push ke `main` untuk menangkap `--no-verify`.
- Tipe commit: `feat fix chore docs refactor test`.
- Subjek imperatif, tidak diawali huruf besar kecuali akronim, seluruh header maksimal 100 karakter. Body menjelaskan apa dan mengapa.
- Jangan `git push --force` atau push langsung ke `main` tanpa konfirmasi eksplisit dari pemilik repo. Konflik merge diselesaikan bersama pengguna, bukan otomatis.
- Satu PR satu concern. PR yang mengubah arsitektur menyertakan ADR.
- Tidak ada trailer atribusi atau co-authorship di commit dan PR.
