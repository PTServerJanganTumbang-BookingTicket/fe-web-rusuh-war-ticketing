# Rusuh Booking Tiket — Frontend

Next.js 16 (App Router) + Tailwind, satu aplikasi (pnpm) dengan modul fitur Clean Architecture dan DI Awilix. Arsitektur: [docs/architecture/overview.md](docs/architecture/overview.md). Keputusan: [docs/adr](docs/adr).

## Menjalankan

```bash
pnpm install
pnpm dev          # http://localhost:3000, API dimock dengan MSW (.env.development)
pnpm check          # lint (termasuk aturan lapisan) + typecheck + test
pnpm test:e2e       # Playwright (Chrome terpasang lokal), jam palsu, mock MSW
```

Skenario mock di browser: `/events/evt-konser-rusuh/queue?scenario=queue-stuck` (default `queue-moving`; juga `booking-expiring`). Halaman `/book` butuh cookie dari alur queue, jadi masuk lewat Waiting Room dulu.
Untuk backend asli: kosongkan `NEXT_PUBLIC_API_MOCKING` dan isi `NEXT_PUBLIC_API_BASE_URL` (lihat `.env.example`).

## Struktur

| Lokasi | Isi |
|---|---|
| `src/app` | Routing, layout, route handler. `src/proxy.ts` menjaga `/events/*/book` dan `/orders/*/pay` |
| `src/di` | Composition root: container Awilix (`createAppContainer`), `AppConfig` dari env, `AppProviders`, `getServerDependencies` |
| `src/modules/<m>` | Modul fitur (`catalog`, `queue`, `booking`, `payment`, `auth`, `ticket`), masing-masing dengan `domain/` (model, rules, constants, protocol), `application/` (use case), `data/` (service + schema zod), `controllers/` (controller, mapper, query options), `views/` (Container + View) dan `<m>.module.ts` |
| `src/core` | Kode bersama dengan lapisan yang sama: `domain/` (`AppError`, `AppConfig`, protocol jam/acak/sesi, waktu), `application/`, `data/` (`FetchHttpClient`, klien SSE, sesi), `controllers/` (`useCountdown`, `useLiveUpdates`, `useDependencies`), `views/design-system/` (Signal), `i18n/` |
| `src/mocks` | Handler MSW dan skenario, dipakai dev server (server + browser) dan test |
| `src/test` | Support test: server MSW bersama, container uji |
| `eslint.boundaries.mjs` | Aturan lapisan dan modul (ADR-0014) |

Menambah fitur: skill [`new-module`](docs/ai/skills/new-module/SKILL.md) dan [`new-feature-screen`](docs/ai/skills/new-feature-screen/SKILL.md).

## Irisan vertikal yang sudah ada

- **Home** (`/`): Server Component, `use cache` revalidate 15 dtk, event dari API mock.
- **Waiting Room** (`/events/[eventId]/queue`): polling dengan jitter, tampilan posisi, estimasi, dan progress seperti wireframe 9.2; saat admitted otomatis menyimpan cookie httpOnly lewat `/api/session/start` lalu pindah ke `/book` (tombol "Coba lagi" hanya muncul bila gagal).
- **Detail Ticket / Pilih Tiket** (`/events/[eventId]/book`): dummy mengikuti wireframe 9.3. NIK tersamar dari akun (hanya-baca, ADR-0011), pilih kategori dengan batas 3 tiket, countdown dari `expiresAt`, peringatan 60 detik, dan layar sesi berakhir saat server menjawab `ACCESS_EXPIRED`. Saat waktu habis dan server menjawab `ACCESS_EXPIRED`, customer dikembalikan ke Waiting Room; ubah `NEXT_PUBLIC_BOOKING_EXPIRY=screen` di `.env.development` (restart dev server) untuk menampilkan layar sesi berakhir. Tombol "Lanjut ke Pembayaran" masih langsung ke placeholder payment. Skenario `?scenario=booking-expiring` (diberikan di halaman queue) membuat TTL booking 75 detik.
- **Pembayaran** (`/orders/[orderId]/pay` dan `/m/orders/[orderId]/pay`): mock mengikuti wireframe 9.4 dan 9.5. Pilih metode (Virtual Account, E-Wallet, Transfer Bank), "Bayar Sekarang" menampilkan instruksi (QR contoh untuk E-Wallet, nomor VA, atau rekening), lalu dua tombol **Simulasikan berhasil / gagal** (hanya muncul saat `NEXT_PUBLIC_API_MOCKING=enabled`) menggantikan notifikasi Midtrans. Hasil: layar berhasil atau gagal/expired. QR-nya pola acak, bukan QR sungguhan. Skenario `?scenario=payment-expiring` (diberikan di halaman queue) membuat TTL bayar 45 detik.
- Layar lain (login, ticket) masih placeholder.

## Design system

Tampilan memakai Telkomsel Signal DS: token, skala tipografi, dan primitif diporting dari implementasi referensi internal tim (ADR-0012). Preset token: `src/core/views/design-system/signal.css`. Primitif: `src/core/views/design-system/primitives`. Layout bersama: `ScreenFrame`. Hanya tema terang. Font Telkomsel Batik Sans milik Telkomsel; izin redistribusi perlu dikonfirmasi sebelum repo dipublikasikan.
