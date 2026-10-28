# Konvensi Kode

## Bahasa dan tipe

- TypeScript `strict: true`, `noUncheckedIndexedAccess: true`. Tidak ada `any`. Gunakan `unknown` lalu parse.
- Tipe domain di `domain` memakai discriminated union untuk state (`{ status: 'held'; expiresAt: string } | ...`).

## Penamaan

| Hal | Konvensi | Contoh |
|---|---|---|
| File komponen | PascalCase | `QueuePosition.tsx` |
| File non-komponen | camelCase | `remainingMs.ts` |
| ViewModel | `use<Screen>ViewModel` | `useBookingViewModel` |
| Mapper ke props View | `to<Screen>ViewProps` (murni, di folder fitur) | `toBookingViewProps` |
| Helper test yang bukan hook | awalan `setup`, bukan `use` (lint `rules-of-hooks`) | `setupMockServer` |
| Flag build | `NEXT_PUBLIC_<NAMA>` di `.env.example` | `NEXT_PUBLIC_BOOKING_EXPIRY` |
| Container | `<Screen>Container` | `BookingContainer` |
| View | `<Screen>View` | `BookingView` |
| Reducer event | `SCREAMING_SNAKE` di `type` | `{ type: 'ADD_TICKET' }` |
| Key i18n | `feature.context.message` | `booking.quota.exceeded` |
| Query key | factory `<m>Keys` di `presentation/<m>Queries.ts`, diawali nama modul | `queueKeys.position(eventId)` |
| Folder modul | camelCase, kata benda bounded context | `catalog`, `booking`, `payment` |
| Registrasi modul | `<m>.module.ts` mengekspor `<m>Module()` dan `type <M>Cradle` | `bookingModule`, `BookingCradle` |
| Port | PascalCase, kata benda + peran, tanpa awalan `I` | `OrderRepository`, `SessionGateway`, `Clock` |
| Use case | Kelas PascalCase kata kerja + benda, satu method `execute` | `GetBookingSession`, `StartPayment` |
| Adapter | Teknologi + nama port | `HttpOrderRepository`, `FetchHttpClient`, `SystemClock` |
| Nama registrasi container | camelCase dari nama port/use case | `orderRepository`, `getOrder` |
| Irisan dependensi presentation | `<M>Dependencies` di `application/dependencies.ts` | `PaymentDependencies` |

## Komponen

- Komponen design system (`src/ui/design-system`) dan view modul memakai komponen Signal DS sebagai dasar. Tailwind hanya untuk layout dan spacing yang tidak disediakan Signal.
- Token warna dan tipografi diambil dari preset Signal, bukan nilai hex langsung.
- Komponen fungsi saja (tanpa class). Satu-satunya pengecualian adalah error boundary, karena React belum menyediakan versi hook.
- Props komponen primitif memperluas atribut HTML bawaan (`React.ComponentProps<"button">`) dan meneruskan `...rest` ke elemen akar.
- Dialog dan popup memakai primitif Radix `Dialog` (Escape menutup, `aria-modal`, jebakan fokus, kunci scroll, fokus kembali ke pemicu). Jangan membuat ulang secara manual.
- Setiap komponen interaktif bisa dioperasikan dengan keyboard dan punya label aksesibel. Countdown: elemen `role="timer"` dengan `aria-live="off"` agar tidak diumumkan tiap detik. Pengumuman lewat live region terpisah: peringatan 60 detik memakai `assertive`. Pengingat berkala (`polite`) belum ada dan perlu diputuskan bersama tim aksesibilitas.

## Token desain

- Warna, radius, dan tipografi lewat token Signal DS: `bg-primary`, `text-muted-foreground`, `border`, `bg-signal-bg-valid`, `text-signal-error`, `bg-brand`. Nilainya ada di satu tempat, `src/ui/design-system/signal.css` (ADR-0012).
- Tipografi memakai kelas skala Signal: `type-h1`…`type-h6` (Telkomsel Batik Sans) dan `type-title`, `type-body1`, `type-body2` (Poppins), bukan ukuran font ad hoc.
- Tidak ada hex, `rgb()`, atau nama warna Tailwind mentah (`violet-700`) di `src/ui/design-system` dan `presentation/views`.
- Elemen interaktif dan wadah dibangun dari primitif (`Button`, `Badge`, `Card`, `Alert`, `Progress`, `RadioGroup`). Varian Signal baru ditambahkan ke primitif, bukan ditulis ulang di view.
- Wireframe adalah referensi struktur dan isi, **bukan** desain visual. Target visual adalah Telkomsel Signal DS.

## Aksesibilitas

- Pakai elemen semantik (`<button>`, `<nav>`, `<main>`), bukan `<div onClick>`. ESLint menegakkan `click-events-have-key-events`, `no-static-element-interactions`, `label-has-associated-control`, dan `anchor-is-valid`.
- Gambar punya `alt`; gambar dekoratif memakai `alt=""`.
- Input punya label. Pesan galat dihubungkan ke input lewat `aria-describedby`.
- Target sentuh minimal 44x44px (payment page dipakai di WebView mobile). Primitif `Button` ukuran `lg` setinggi 48px.
- Status memuat memakai `role="status"`.

## ViewModel

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

- Fungsi di `domain` murni dan menerima `now` sebagai parameter bila butuh waktu. Di presentation, jam diambil dari `clock` di container, acak dari `random`.

## Kelas, use case, dan DI (ADR-0014, ADR-0015)

- Kelas hanya untuk use case, adapter, dan port implementasi. Komponen dan ViewModel tetap fungsi.
- Constructor menerima satu objek dependensi dan menyimpannya ke field `private readonly`: `constructor({ orderRepository }: { orderRepository: OrderRepository })`. Tidak ada parameter posisi (Awilix mode PROXY).
- Dependensi constructor bertipe port (interface), bukan kelas adapter.
- Use case tidak menangkap error; biarkan `AppFailure` naik ke ViewModel.
- Tidak ada `import` dari `awilix` di luar `src/di` dan `*.module.ts`.
- Impor di dalam satu modul memakai path relatif; impor ke `core`, `platform`, `ui`, `di`, atau dari `app` memakai alias `@/`.
- Tidak ada `console.*` di kode yang di-commit (`no-console`). Logger di `api/telemetry` direncanakan tetapi belum ada; sampai ada, jangan mencetak log.
- Komentar menjelaskan *mengapa*, bukan *apa*.
- Tidak ada abstraksi untuk satu pemakaian. Ekstrak setelah dipakai di tempat ketiga.

## Git

- Conventional Commits: `feat(booking): ...`, `fix(queue): ...`, `docs(adr): ...`.
- Hook lokal (Husky): `pre-commit` menjalankan lint-staged (Prettier, ESLint `--max-warnings=0`, dan test terkait via `vitest related` untuk file yang di-stage); `commit-msg` menjalankan commitlint (`commitlint.config.mjs`, termasuk larangan trailer atribusi). CI menjalankan commitlint ulang pada PR untuk menangkap `--no-verify`.
- Tipe commit: `feat fix docs style refactor perf test build ci chore revert`.
- Subjek huruf kecil, imperatif, maksimal 72 karakter. Body menjelaskan apa dan mengapa.
- Jangan `git push --force` atau push langsung ke `main` tanpa konfirmasi eksplisit dari pemilik repo. Konflik merge diselesaikan bersama pengguna, bukan otomatis.
- Satu PR satu concern. PR yang mengubah arsitektur menyertakan ADR.
- Tidak ada trailer atribusi atau co-authorship di commit dan PR.
