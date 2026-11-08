# Rusuh Booking Tiket — Frontend

[![Quality gate status](https://sonarcloud.io/api/project_badges/measure?project=fe-web-rusuh-war-ticketing&metric=alert_status&token=557598462acacb24492e29beb290088bf6561b16)](https://sonarcloud.io/summary/new_code?id=fe-web-rusuh-war-ticketing)

Frontend penjualan tiket konser online yang tahan flash crowd: pelanggan masuk antrean (Waiting Room), memilih tiket dengan NIK per tiket, lalu membayar lewat Virtual Account atau e-wallet. Halaman pembayaran juga dipakai ulang di WebView aplikasi mobile.

Satu aplikasi Next.js (bukan monorepo) dengan modul fitur Clean Architecture dan injeksi dependensi Awilix.

## Teknologi

| Area | Pilihan |
|---|---|
| Framework | Next.js 16 (App Router, Cache Components, `proxy.ts`), React 19, TypeScript |
| UI | Telkomsel Signal Design System, Tailwind CSS 4, shadcn/ui di atas Base UI ([ADR-0012](docs/adr/0012-signal-ds-tokens-and-primitives.md), [ADR-0024](docs/adr/0024-shadcn-ui-on-base-ui.md)) |
| State server | TanStack Query, polling dengan jitter dan SSE untuk antrean |
| Validasi data | zod di lapisan `data` |
| DI | Awilix, satu composition root di `src/di` |
| Mock API | MSW, dipakai dev server, test, dan demo (contract-first, [ADR-0009](docs/adr/0009-contract-first-openapi-msw.md)) |
| Test | Vitest + Testing Library (unit dan controller), Playwright dengan jam palsu (e2e) |
| Kualitas | ESLint (termasuk aturan batas lapisan), Prettier, Husky, commitlint, SonarCloud |
| Kemasan | Satu container image Next standalone ([ADR-0021](docs/adr/0021-packaging-single-container-image.md)) |

## Memulai

Butuh Node.js 20 atau lebih baru.

```bash
npm install
npm run dev
```

Buka `http://localhost:3000`. Mode dev memakai API mock MSW (`.env.development`), jadi backend tidak diperlukan.

### Skrip

| Perintah | Fungsi |
|---|---|
| `npm run dev` | Server dev dengan mock MSW |
| `npm run build` / `npm start` | Build produksi (standalone) dan menjalankannya |
| `npm run check` | Format, lint (termasuk aturan lapisan), typecheck, dan test |
| `npm test` / `npm run test:coverage` | Vitest, dengan atau tanpa laporan cakupan (minimum 85%) |
| `npm run test:e2e` | Playwright mobile (Pixel 7), server dev dijalankan otomatis |
| `npm run emails:build` | Kompilasi template email MJML di `emails/` |

### Konfigurasi

Variabel dibaca di satu tempat, `src/di/app-config.reader.ts`. Lihat `.env.example`.

| Variabel | Arti |
|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | URL backend |
| `NEXT_PUBLIC_API_MOCKING` | `enabled` untuk memakai mock MSW; kosongkan untuk backend asli |
| `NEXT_PUBLIC_BOOKING_EXPIRY` | `queue` (default, kembali ke ruang tunggu) atau `screen` (layar sesi berakhir) |

Nilai `NEXT_PUBLIC_*` disisipkan saat build, jadi satu image berarti satu konfigurasi.

### Skenario mock

Waiting Room menerima `?scenario=` untuk menguji kondisi tertentu:

- `/events/evt_konser_a/queue` — antrean berjalan normal (default)
- `?scenario=queue-stuck` — antrean tidak bergerak
- `?scenario=booking-expiring` — TTL booking 75 detik
- `?scenario=payment-expiring` — TTL pembayaran 45 detik

Halaman `/book` dan `/pay` butuh cookie dari alur antrean, jadi masuk lewat Waiting Room dulu.

## Fitur

- **Home** (`/`): daftar event, tersedia atau tidak tersedia, diambil di server dan disegarkan berkala. Tetap statis; CI memeriksanya ([ADR-0007](docs/adr/0007-rendering-strategy.md)).
- **Waiting Room** (`/events/[eventId]/queue`): posisi, estimasi, dan progres yang diperbarui otomatis; saat giliran tiba, token disimpan di cookie httpOnly dan pelanggan dipindah ke Detail Ticket.
- **Detail Ticket** (`/events/[eventId]/book`): identitas pemesan, kategori dan stok, maksimal 3 tiket per transaksi, satu NIK per tiket (dicek ke Dukcapil), alias NIK dari profil, dan countdown booking.
- **Pembayaran** (`/orders/[orderId]/pay`, `/m/orders/[orderId]/pay` untuk WebView): Virtual Account atau e-wallet lewat backend (Midtrans), polling status, ganti metode saat gagal, dan penanganan waktu habis.
- **Akun dan tiket**: login tanpa kata sandi lewat magic link, registrasi, profil dengan alias NIK, daftar tiket, dan e-tiket ([ADR-0023](docs/adr/0023-passwordless-login-email.md)).
- **Bantuan** (`/help`) dan **dua bahasa** (Indonesia dan Inggris, pilihan disimpan di perangkat).

Dua prinsip yang tidak boleh dilanggar: UX tetap jelas apa pun kondisi backend, dan frontend tidak pernah memutus pelanggan yang sudah dapat slot atau sudah booking. Konteks lengkap: [`.kiro/steering/product.md`](.kiro/steering/product.md).

## Struktur

| Lokasi | Isi |
|---|---|
| `src/app` | Routing, layout, dan route handler (`/api/auth`, `/api/account`, `/api/session`, `/api/health`). `src/proxy.ts` menjaga `/events/*/book` dan `/orders/*/pay` |
| `src/di` | Composition root: container Awilix, `AppConfig` dari env, `AppProviders` |
| `src/modules/<m>` | Modul fitur: `catalog`, `queue`, `booking`, `payment`, `auth`, `ticket`, `help`. Tiap modul berlapis `domain/` → `application/` → `data/` → `controllers/` → `views/` |
| `src/core` | Kode bersama dengan lapisan yang sama: `AppError`, jam dan waktu server, klien HTTP dan SSE, hook controller, `i18n/` |
| `src/components/ui` | Primitif dan layout design system |
| `src/mocks` | Handler MSW dan skenario |
| `src/test` | Dukungan test: server MSW bersama, container uji |
| `e2e` | Skenario Playwright |
| `emails` | Template email MJML |
| `docs` | ADR, arsitektur, kontrak API, notulen |
| `.kiro` | Aturan dan skill untuk asisten AI |
| `eslint.boundaries.mjs` | Aturan batas lapisan dan modul ([ADR-0014](docs/adr/0014-modular-clean-architecture-solid.md)) |

Menambah fitur: skill [`new-module`](.kiro/skills/new-module/SKILL.md), [`new-feature-screen`](.kiro/skills/new-feature-screen/SKILL.md), dan [`new-ui-component`](.kiro/skills/new-ui-component/SKILL.md).

## Pengujian dan kualitas

- Cakupan dihitung untuk seluruh kode logika di `src` dengan minimum 85%. Yang dikecualikan hanya presentasional dan infrastruktur uji (view, `components/ui`, halaman dan layout, mock, dukungan test). Daftarnya ada di `vitest.config.ts` dan `sonar-project.properties`, dan harus sama.
- Test ditaruh di folder `__tests__` di sebelah file yang dites ([ADR-0020](docs/adr/0020-test-file-organization.md)). Aturan lengkap: [`.kiro/steering/testing.md`](.kiro/steering/testing.md).
- CI (`.github/workflows/ci.yml`) menjalankan format, lint, typecheck, test dengan cakupan, analisis SonarCloud, build, dan pemeriksaan Home statis. Job lain membangun dan menguji container image, dan menjalankan e2e Playwright.
- Pesan commit mengikuti Conventional Commits dengan tag tiket, misalnya `[NO-JIRA][nama] fix(scope): ringkasan`, dicek oleh hook Husky lokal (commitlint), bukan oleh CI.

## Container

```bash
docker build -t rusuh-fe \
  --build-arg NEXT_PUBLIC_API_BASE_URL=https://api.example.com \
  --build-arg NEXT_DEPLOYMENT_ID=$(git rev-parse --short HEAD) .
docker run --rm -p 3000:3000 rusuh-fe
```

Image berisi hasil standalone saja, berjalan sebagai user non-root, dan menyediakan `/api/health` untuk probe. Rencana deploy ke Cloudflare: [docs/deploy](docs/deploy/cloudflare-cicd-plan.md).

## Dokumentasi

Mulai dari [`docs/README.md`](docs/README.md): [arsitektur](docs/architecture/overview.md), [keputusan arsitektur (ADR)](docs/adr/README.md), [kontrak API](docs/api/api-contract.md), dan notulen rapat. Requirement dan kontrak API sumbernya repo `documentations`; bila berbeda, repo itu yang berlaku.

## Catatan

Font Telkomsel Batik Sans milik Telkomsel. Izin redistribusi perlu dikonfirmasi sebelum repo dipublikasikan.
