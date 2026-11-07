# Rencana: deploy ke Cloudflare lewat CI/CD

- **Status**: Rencana, belum dikerjakan. Belum ada perubahan kode, `package.json`, atau workflow.
- **Tanggal**: 2026-11-07
- **Terkait**: ADR-0007 (rendering, Home statis), ADR-0018 (trunk-based), ADR-0021 (container image), `.github/workflows/ci.yml`

Hasil akhirnya perlu ADR baru yang menggantikan sebagian ADR-0021 (target deploy). Rencana ini bahan untuk ADR itu.

## 1. Kondisi aplikasi yang memengaruhi pilihan

| Fitur yang dipakai | Di mana | Dampak ke Cloudflare Workers |
|---|---|---|
| `cacheComponents: true`, `"use cache"` di Home | `next.config.ts`, `src/app/(public)/page.tsx` | Butuh cache handler yang didukung adapter; CI menuntut `/` tetap statis |
| `proxy.ts` (pengganti middleware, Next 16) | `src/proxy.ts` | Harus didukung adapter sebagai middleware Worker |
| Route handler `/api/session/*`, `/api/auth/*`, `/api/account/*`, `/api/health` | `src/app/api` | Jalan di runtime Worker; cookie httpOnly dan Bearer ke BE |
| `output: "standalone"` | `next.config.ts` | Tidak dipakai di Workers; tetap untuk image Docker (ADR-0021) |
| `NEXT_PUBLIC_*` di-inline saat build | `.env.example`, `src/di/app-config.reader.ts` | Satu build per environment, sama seperti image |
| MSW hanya bila `NEXT_PUBLIC_API_MOCKING=enabled` | `src/di/AppProviders.tsx`, `next.config.ts` | Build produksi harus tanpa variabel ini |
| `next/font/google` (Poppins), `next/font/local` (Batik Sans) | `src/app/layout.tsx` | Build butuh akses Google Fonts |
| `next/image` | view tiket dan katalog | Optimasi gambar butuh binding Images atau loader |

## 2. Pilihan adapter

| | OpenNext (`@opennextjs/cloudflare`) | vinext (`@vinext/cloudflare`) |
|---|---|---|
| Dasar | Output `next build` asli, dibungkus jadi Worker | Implementasi ulang API Next di atas Vite |
| `cacheComponents` / `"use cache"` | Mengikuti Next; cache lewat incremental cache (R2/KV) dan tag cache (D1/DO). **Perlu diverifikasi untuk Next 16.4** | README vinext: *"use cache" partially implemented*; perilaku `cacheComponents` belum lengkap |
| `proxy.ts` | Perlu diverifikasi untuk Next 16 | README menyebut middleware didukung; `proxy.ts` tidak disebut eksplisit |
| Perubahan tooling | Tambah `open-next.config.ts` dan `wrangler.jsonc`; `next dev` dan Turbopack tetap | Ganti ke Vite (`vite.config.ts`, `cloudflare.config.ts`); konfigurasi Turbopack diabaikan |
| Font | Self-host saat build seperti sekarang | Google Fonts dari CDN saat runtime (melanggar aturan "font lewat `next/font`, tanpa CDN runtime" di coding-conventions) |

**Rekomendasi: OpenNext untuk produksi, vinext sebagai spike terpisah.** Panduan Cloudflare memakai vinext sebagai bawaan untuk proyek baru, tetapi aplikasi ini sudah bergantung pada `cacheComponents` (Home statis adalah syarat CI, ADR-0007) dan font self-hosted, dua hal yang menurut README vinext belum setara Next. Keputusan akhir menunggu hasil langkah 3.1.

## 3. Langkah

### 3.1 Spike kompatibilitas (1 hari, branch terpisah)

1. OpenNext: pasang `@opennextjs/cloudflare` dan `wrangler`, jalankan `npx opennextjs-cloudflare build` lalu `npx opennextjs-cloudflare preview`. Cek: Home dari cache, `proxy.ts` mengalihkan `/events/*/book` tanpa grant, `/api/session/start` menyetel cookie, `/api/health` 200, alur antre → booking → payment dengan BE staging.
2. vinext: `npx vinext check` (laporan skor kompatibilitas, tanpa memasang apa pun). Catat item `cacheComponents`, `proxy.ts`, font.
3. Bila OpenNext gagal di salah satu cek, catat penyebabnya dan bandingkan dengan vinext sebelum memilih.

### 3.2 Konfigurasi (setelah adapter dipilih, contoh untuk OpenNext)

- `wrangler.jsonc`: nama Worker per environment (`rusuh-fe-staging`, `rusuh-fe-production`), `compatibility_flags: ["nodejs_compat"]`, binding R2 untuk incremental cache dan D1 atau Durable Object untuk tag cache (revalidasi Home).
- `open-next.config.ts`: pasang incremental cache R2 dan tag cache.
- `next.config.ts`: `output: "standalone"` tetap untuk image Docker; OpenNext membaca build Next biasa. Tambah `initOpenNextCloudflareForDev()` hanya bila binding dipakai saat `next dev`.
- `.gitignore`: `.open-next/`, `.wrangler/`.
- Script `package.json`: `build:cf`, `preview:cf`, `deploy:cf`.
- Domain: custom domain atau route di zona Cloudflare; `NEXT_PUBLIC_APP_BASE_URL` disamakan.

### 3.3 Pipeline GitHub Actions

Workflow baru `.github/workflows/deploy-cloudflare.yml`, dijalankan setelah job `check` di `ci.yml` lolos:

| Pemicu | Job | Isi |
|---|---|---|
| Pull request | `preview` | `npm ci`, build dengan env staging, `wrangler versions upload` (URL preview per PR, tidak menggeser trafik), komentar URL di PR |
| Push ke `main` | `deploy-staging` | Build dengan env staging, `wrangler deploy --env staging`, smoke test `/api/health` dan `/` |
| Tag `v*` atau dispatch manual | `deploy-production` | GitHub Environment `production` dengan reviewer wajib, build dengan env produksi, `wrangler versions upload` lalu `wrangler versions deploy` bertahap (10% → 100%), smoke test |

Aturan pipeline:

- `NEXT_PUBLIC_API_MOCKING` tidak pernah di-set di job deploy; satu langkah memastikan bundle tidak berisi `mockServiceWorker` (sama dengan cek ukuran bundle yang ada).
- `NEXT_DEPLOYMENT_ID` diisi SHA commit (proteksi version skew, ADR-0021).
- Cek Home statis dari `ci.yml` tetap wajib sebelum deploy.
- `concurrency` per environment supaya dua deploy tidak tumpang tindih.
- Rollback: `wrangler rollback` ke versi sebelumnya (versi Worker immutable).

### 3.4 Secret dan variabel

| Nama | Jenis | Isi |
|---|---|---|
| `CLOUDFLARE_API_TOKEN` | Secret per environment | Token dari templat "Edit Cloudflare Workers", dibatasi ke akun dan zona proyek |
| `CLOUDFLARE_ACCOUNT_ID` | Variable | ID akun Cloudflare |
| `NEXT_PUBLIC_*` | Variable per environment | Sama dengan `.env.example`, nilai staging dan produksi |
| Secret server (bila ada untuk route `/api`) | `wrangler secret put` | Tidak di-inline ke bundle |

### 3.5 Yang perlu diputuskan tim

1. Apakah image Docker (ADR-0021) tetap dipertahankan sebagai jalur cadangan, atau diganti penuh oleh Workers.
2. Zona dan domain produksi, dan siapa pemegang akun Cloudflare.
3. Revalidasi Home: interval saja (tanpa tag cache, lebih sederhana) atau `revalidateTag` (butuh D1/DO).
4. Optimasi gambar: Cloudflare Images (berbayar) atau gambar BE dipakai apa adanya (`unoptimized`).

## 4. Risiko

- `"use cache"` dan `cacheComponents` di adapter mana pun belum terbukti untuk Next 16.4 di repo ini; spike 3.1 adalah gerbangnya.
- Batas ukuran Worker (bundle terkompresi) bisa terlampaui; ukur di spike.
- Flash crowd: Workers berskala otomatis, tetapi BE tetap titik sempit. Rate limit dan antrean tetap di BE.
- `next/font/google` butuh akses jaringan saat build di runner GitHub (sudah sama dengan build image saat ini).
