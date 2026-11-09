# Deploy: Vercel dengan DNS Cloudflare

- **Status**: Berjalan. Menggantikan rencana deploy ke Cloudflare Workers (dihapus).
- **Hosting**: Vercel (Next.js, `next build`).
- **DNS**: Cloudflare. Domain terdaftar di Domainesia, dan nameserver-nya diarahkan ke Cloudflare.
- **Terkait**: ADR-0007 (rendering, Home statis), ADR-0021 (container image), `.github/workflows/ci.yml`

## Alur

1. PR menjalankan CI (`format:check`, `lint`, `typecheck`, `test:coverage`, SonarCloud, `build`, image Docker, e2e).
2. Vercel membuat preview deployment per PR dan production deployment dari `main`.
3. Domain produksi menunjuk ke Vercel lewat record DNS di Cloudflare.

## Variabel lingkungan di Vercel

Variabel `NEXT_PUBLIC_*` di-inline saat build, jadi mengubahnya butuh redeploy.

| Variabel | Production | Preview |
|---|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | URL backend produksi | URL backend staging |
| `NEXT_PUBLIC_API_MOCKING` | kosong | kosong, atau `enabled` untuk preview tanpa backend |
| `NEXT_PUBLIC_BOOKING_EXPIRY` | `queue` | `queue` |

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
