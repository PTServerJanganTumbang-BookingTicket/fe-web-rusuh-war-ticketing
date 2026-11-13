# Deploy: Vercel dengan DNS Cloudflare

- **Status**: Berjalan. Menggantikan rencana deploy ke Cloudflare Workers (dihapus).
- **Hosting**: Vercel (Next.js, `next build`).
- **DNS**: Cloudflare. Domain terdaftar di Domainesia, dan nameserver-nya diarahkan ke Cloudflare.
- **Terkait**: ADR-0007 (rendering, Home statis), ADR-0021 (container image), `.github/workflows/ci.yml`

## Alur

1. PR menjalankan CI. `detect-changes` memilih job menurut berkas yang berubah: `check` (`format:check`, `lint`, `typecheck`, `test:coverage`, SonarCloud, `build`), `image` (hanya bila Dockerfile, dependensi, atau konfigurasi build berubah), dan `e2e` (hanya bila kode aplikasi atau spek berubah). Perubahan dokumen saja tidak menjalankan job mahal. `Quality Gate` adalah satu-satunya check wajib.
2. Vercel membuat preview deployment per PR dan production deployment dari `main`.
3. Domain produksi menunjuk ke Vercel lewat record DNS di Cloudflare.

## Variabel lingkungan di Vercel

Variabel `NEXT_PUBLIC_*` di-inline saat build, jadi mengubahnya butuh redeploy.

| Variabel | Production | Preview |
|---|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | `https://api.rush-my-ticket.my.id` | `https://api.rush-my-ticket.my.id` (belum ada staging terpisah) |
| `NEXT_PUBLIC_API_CREDENTIALS` | `omit` | `omit` |
| `NEXT_PUBLIC_API_MOCKING` | kosong | kosong, atau `enabled` untuk preview tanpa backend |
| `NEXT_PUBLIC_BOOKING_EXPIRY` | `queue` (bawaan, boleh kosong) | `queue` (bawaan, boleh kosong) |

`NEXT_PUBLIC_API_CREDENTIALS=omit` wajib selama API menjawab `Access-Control-Allow-Origin: *`: nilai itu tidak boleh dipakai bersama cookie, jadi token antrian dikirim lewat header `X-Queue-Token` dan `X-Device-Id`.

## Host backend

| Host | Fungsi | Catatan |
|---|---|---|
| `https://api.rush-my-ticket.my.id` | API (gateway) | HTTPS, CORS `*` dengan preflight 204 untuk `X-Queue-Token`, `X-Device-Id`, `X-Grant-Token`, `Authorization` |
| `https://sse.rush-my-ticket.my.id` | Stream antrian (SSE) | Alamat lengkapnya dikirim backend di `sse_url` pada respons join; FE tidak menuliskannya sendiri |

Syarat server SSE agar jalan di browser (diperiksa 12 Nov 2026, belum terpenuhi): jawab preflight `OPTIONS` dengan 204, `Access-Control-Allow-Origin` dan `Access-Control-Allow-Headers: x-queue-token, x-device-id, cache-control, last-event-id, accept` pada semua respons termasuk 401/410/429, serta header stream `Content-Type: text/event-stream`, `Cache-Control: no-cache`, `Connection: keep-alive`. `GET /events/{id}/queue/serving` (polling cadangan) juga belum ada; sementara itu FE memakai `GET /queue/me`.

Secret backend (kunci server Turnstile, kunci payment gateway) tidak disimpan di proyek ini. Site key Turnstile datang dari `GET /events/{id}`.

## DNS di Cloudflare

- Record `CNAME` (atau `A`) ke target yang ditampilkan Vercel di Settings → Domains.
- Pakai mode **DNS only** (awan abu-abu) untuk record yang menunjuk ke Vercel, supaya Vercel yang menerbitkan sertifikat dan menangani TLS.
- Di Domainesia, ganti nameserver domain ke dua nameserver yang diberikan Cloudflare.

## Turnstile

Daftarkan hostname produksi, hostname preview Vercel yang dipakai untuk uji, dan `localhost` di dashboard Turnstile. Widget harus bermode **Invisible**.

## Pemeriksaan setelah deploy

- `/api/health` menjawab 200.
- Home (`/`) tetap statis (CI memeriksa baris `○ /` pada log build).
- Join antrian mengirim `captcha_token` dan tidak ditolak 403.
- `sse_url` dari respons join berupa HTTPS, dan stream tersambung dari halaman `/events/{id}/queue` (tanpa Mixed Content atau CORS di console).
