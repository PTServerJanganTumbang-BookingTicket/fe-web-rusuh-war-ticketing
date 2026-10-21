# ADR-0013: Packaging sebagai satu container image

- **Status**: Proposed
- **Tanggal**: 2026-10-21
- **Pengambil keputusan**: Tim FE Web
- **Requirement terkait**: NFR-01, NFR-03, NFR-08

## Konteks

Monorepo berisi satu aplikasi yang berjalan (`apps/web`) dan beberapa library (`packages/*`, `mocks`). Deployment harus bisa di-scale horizontal saat flash crowd, dan rolling deploy tidak boleh memutus customer yang sedang di tengah pembayaran ("Jangan PHP").

## Opsi yang dipertimbangkan

1. **Satu image Next.js `output: "standalone"`.** Package workspace ter-compile ke dalam build. Satu proses Node, stateless kecuali cache `use cache` per instance.
2. **Static export (`output: "export"`) di CDN saja.** Tanpa server, tetapi kehilangan `proxy.ts` (token gate), route handler `/api/session/*`, dan revalidasi Home.
3. **Image per halaman atau per package.** Package bukan deployable, dan memecah halaman menambah biaya operasional tanpa menambah ketahanan.

## Keputusan

Opsi 1.

- **`next.config.ts`**: `output: "standalone"`, `outputFileTracingRoot` ke root monorepo, `poweredByHeader: false`.
- **`Dockerfile` multi-stage tanpa Turborepo**: `pnpm fetch` dari lockfile (layer di-cache selama lockfile tetap) → `pnpm install --offline` → `pnpm build` → runtime `node:22-alpine` dengan user non-root, `tini` sebagai PID 1, dan `HEALTHCHECK`.
- **Satu image melayani route web dan route embed `/m/...`** untuk WebView.
- **Konfigurasi `NEXT_PUBLIC_*` masuk sebagai `--build-arg`.** Next meng-inline nilainya ke bundle saat build, jadi **satu image = satu konfigurasi environment**. Build ulang per environment adalah konsekuensi yang diterima sampai ada kebutuhan promosi satu image lintas environment (lihat "Pekerjaan lanjutan").
- **`NEXT_PUBLIC_API_MOCKING` default kosong di Dockerfile**, sehingga kode MSW dilipat keluar dari bundle produksi.
- **`NEXT_DEPLOYMENT_ID` (mis. SHA commit) dioper saat build** untuk proteksi version skew: aset mendapat `?dpl=`, navigasi membawa `x-deployment-id`, dan cache `use cache` ikut di-namespace per deployment.
- **`/api/health`** dinamis, `no-store`, dan tidak memanggil BE. Gangguan BE tidak boleh membuat orkestrator membunuh container yang masih bisa melayani Home dari cache.
- **Font di-self-host** (`next/font/local`). Build image tidak boleh bergantung pada Google Fonts, karena gagal di jaringan tertutup atau di belakang proxy korporat.
- **Aset statis dan Home di depan CDN.** Home sudah mengirim `Cache-Control: s-maxage=15, stale-while-revalidate=585`, dan aset di `/_next/static` immutable.

## Konsekuensi

- **Positif**: satu artefak immutable per environment, rollback cukup dengan mengganti tag image. Isi standalone sekitar 43 MB (server + `node_modules` hasil tracing), tanpa source, pnpm, atau kode mock. Proses berhenti rapi saat SIGTERM, sehingga request yang sedang berjalan selesai dulu.
- **Negatif**: cache `use cache` (Home) tersimpan in-memory per instance. Antar replica, status Home bisa berbeda sampai satu interval revalidate (15 detik). Ini diterima, karena tombol "Beli" tetap divalidasi queue service dan CDN di depan membuat Home jarang menyentuh container.
- **Negatif**: `next build` mem-prerender Home dengan memanggil `NEXT_PUBLIC_API_BASE_URL`. Tanpa backend yang bisa dijangkau dari build, Home ter-bake dengan state error sampai revalidate pertama (sudah dicatat di ADR-0007).
- **Negatif**: `proxy.ts` berjalan di proses Node, bukan di edge. Request tanpa token tetap sampai ke container sebelum di-redirect.
- **Yang harus dijaga**:
  - Job `image` di CI membangun image dan gagal bila ukurannya di atas 300 MB.
  - Setiap `NEXT_PUBLIC_*` di `apps/web/.env.example` harus punya `ARG` di `Dockerfile`. Dicek job `image` di CI.
  - Route `/` tetap statis (`○`) di log build (job `check`, ADR-0007).

## Pekerjaan lanjutan (belum diputuskan)

- **Promosi satu image lintas environment.** Butuh konfigurasi runtime: `NEXT_PUBLIC_API_BASE_URL` diganti nilai yang dibaca server saat runtime dan diteruskan ke client (mis. `<script src="/runtime-config.js">` dari route handler dinamis). Sisi server (prerender Home) juga harus membaca env tanpa prefix `NEXT_PUBLIC_`, karena Next meng-inline variabel berprefiks itu di bundle server juga.
- **Cache bersama antar replica** lewat `cacheHandlers` (mis. Redis) bila selisih status Home 15 detik antar replica dianggap tidak cukup.
- **`NEXT_SERVER_ACTIONS_ENCRYPTION_KEY`** wajib diset sama di semua replica jika Server Actions mulai dipakai.

## Catatan verifikasi (2026-10-21)

- Langkah Dockerfile dijalankan di salinan bersih repo yang difilter `.dockerignore`: `pnpm fetch` → `pnpm install --offline --frozen-lockfile` → `pnpm build`, lalu layout `/app` disusun seperti stage runtime. Hasil: `/api/health` 200 `no-store`, Home 200 dengan `x-nextjs-cache: HIT` dan `data-dpl-id`, aset JS, CSS, dan font 200, `/orders/*/pay` tanpa cookie di-redirect, tidak ada header `X-Powered-By`, tidak ada `mockServiceWorker` di chunk client, dan proses keluar saat SIGTERM.
- `docker build` penuh **belum** dijalankan: lingkungan sesi tidak bisa menarik base image dari Docker Hub. Job `image` di CI menjadi verifikasi pertama untuk stage `node:22-alpine`, `corepack`, dan `tini`.
