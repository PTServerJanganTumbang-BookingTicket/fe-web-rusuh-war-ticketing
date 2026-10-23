# Rusuh Booking Tiket — Frontend

Next.js 16 (App Router) + Tailwind, monorepo npm workspaces. Arsitektur: [docs/architecture/overview.md](docs/architecture/overview.md). Keputusan: [docs/adr](docs/adr).

## Menjalankan

```bash
npm install            # npm >= 10; lockfile: package-lock.json (ADR-0014)
npm run dev            # http://localhost:3000, API dimock dengan MSW (apps/web/.env.development)
npm run check          # lint (termasuk aturan lapisan dan dependensi) + typecheck + test
npm run test:e2e       # Playwright (Chrome terpasang lokal), jam palsu, mock MSW
```

Skenario mock di browser: `/events/evt-konser-rusuh/queue?scenario=queue-stuck` (default `queue-moving`; juga `booking-expiring`). Halaman `/book` butuh cookie dari alur queue, jadi masuk lewat Waiting Room dulu.
Untuk backend asli: kosongkan `NEXT_PUBLIC_API_MOCKING` dan isi `NEXT_PUBLIC_API_BASE_URL` (lihat `apps/web/.env.example`).

## Container image

Satu image untuk seluruh aplikasi web, termasuk route embed WebView (ADR-0013).

```bash
docker build -t rusuh-fe \
  --build-arg NEXT_PUBLIC_API_BASE_URL=https://api.example.com \
  --build-arg NEXT_DEPLOYMENT_ID=$(git rev-parse --short HEAD) .
docker run --rm -p 3000:3000 rusuh-fe     # probe: GET /api/health
```

Nilai `NEXT_PUBLIC_*` di-inline saat build, jadi bangun satu image per environment. Untuk demo dengan mock, tambahkan `--build-arg NEXT_PUBLIC_API_MOCKING=enabled`.

## Struktur

| Lokasi | Isi |
|---|---|
| `apps/web/app` | Routing dan komposisi saja. `proxy.ts` menjaga `/events/*/book` dan `/orders/*/pay` |
| `apps/web/features` | ViewModel (`use<Screen>ViewModel`) + Container per layar |
| `packages/core` | Domain murni: `AppError`, `remainingMs`, `withJitter`, `canAddTicket`, tipe event/queue |
| `packages/api` | Satu-satunya HTTP. Response diparse zod, error dipetakan ke `AppError`, query options |
| `packages/ui` | View props-only (belum memakai Signal DS) |
| `packages/i18n` | Pesan id-ID dan `t()` |
| `packages/config` | tsconfig base dan aturan ESLint boundaries (ADR-0002) |
| `mocks` | Handler MSW dan skenario, dipakai dev server (server + browser) dan test |

## Irisan vertikal yang sudah ada

- **Home** (`/`): Server Component, `use cache` revalidate 15 dtk, event dari API mock.
- **Waiting Room** (`/events/[eventId]/queue`): polling dengan jitter, tampilan posisi, estimasi, dan progress seperti wireframe 9.2; saat admitted otomatis menyimpan cookie httpOnly lewat `/api/session/start` lalu pindah ke `/book` (tombol "Coba lagi" hanya muncul bila gagal).
- **Detail Ticket / Pilih Tiket** (`/events/[eventId]/book`): dummy mengikuti wireframe 9.3. NIK tersamar dari akun (hanya-baca, ADR-0011), pilih kategori dengan batas 3 tiket, countdown dari `expiresAt`, peringatan 60 detik, dan layar sesi berakhir saat server menjawab `ACCESS_EXPIRED`. Saat waktu habis dan server menjawab `ACCESS_EXPIRED`, customer dikembalikan ke Waiting Room; ubah `NEXT_PUBLIC_BOOKING_EXPIRY=screen` di `apps/web/.env.development` (restart dev server) untuk menampilkan layar sesi berakhir. Tombol "Lanjut ke Pembayaran" masih langsung ke placeholder payment. Skenario `?scenario=booking-expiring` (diberikan di halaman queue) membuat TTL booking 75 detik.
- **Pembayaran** (`/orders/[orderId]/pay` dan `/m/orders/[orderId]/pay`): mock mengikuti wireframe 9.4 dan 9.5. Pilih metode (Virtual Account, E-Wallet, Transfer Bank), "Bayar Sekarang" menampilkan instruksi (QR contoh untuk E-Wallet, nomor VA, atau rekening), lalu dua tombol **Simulasikan berhasil / gagal** (hanya muncul saat `NEXT_PUBLIC_API_MOCKING=enabled`) menggantikan notifikasi Midtrans. Hasil: layar berhasil atau gagal/expired. QR-nya pola acak, bukan QR sungguhan. Skenario `?scenario=payment-expiring` (diberikan di halaman queue) membuat TTL bayar 45 detik.
- Layar lain (login, ticket) masih placeholder.

## Design system

Tampilan memakai Telkomsel Signal DS: token, skala tipografi, dan primitif diporting dari implementasi referensi internal tim (ADR-0012). Preset token: `packages/config/tailwind/signal.css`. Primitif: `packages/ui/src/primitives`. Layout bersama: `ScreenFrame`. Hanya tema terang. Font Telkomsel Batik Sans milik Telkomsel; izin redistribusi perlu dikonfirmasi sebelum repo dipublikasikan. Poppins di-self-host dari subset latin berlisensi OFL (`apps/web/app/fonts/Poppins-OFL.txt`).
