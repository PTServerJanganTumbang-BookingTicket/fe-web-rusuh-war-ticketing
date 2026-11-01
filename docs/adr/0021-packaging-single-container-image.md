# ADR-0021: Packaging sebagai satu container image

- **Status**: Proposed
- **Tanggal**: 2026-11-01
- **Pengambil keputusan**: Tim FE Web
- **Requirement terkait**: NFR-01, NFR-03, NFR-08

## Konteks

Keputusan packaging ini sudah ada di `main` sebagai ADR lama untuk struktur monorepo, tetapi `Dockerfile`, `.dockerignore`, `/api/health`, dan job `image` di CI tidak ikut saat migrasi ke satu aplikasi (ADR-0013). Tanpa itu `main` tidak bisa menghasilkan artefak deployment, padahal ADR-0018 menuntut `main` selalu releasable.

Deployment harus bisa di-scale horizontal saat flash crowd, dan rolling deploy tidak boleh memutus customer yang sedang di tengah pembayaran ("Jangan PHP").

## Opsi yang dipertimbangkan

1. **Satu image Next.js `output: "standalone"`.** Satu proses Node, stateless kecuali cache `use cache` per instance.
2. **Static export (`output: "export"`) di CDN saja.** Tanpa server, tetapi kehilangan `proxy.ts`, route handler `/api/session/*`, dan revalidasi Home.

## Keputusan

Opsi 1, disesuaikan untuk satu aplikasi.

- **`next.config.ts`**: `output: "standalone"`, `poweredByHeader: false`.
- **`Dockerfile` multi-stage**: `npm ci` dari manifest dan lockfile, lalu `npm run build`, lalu runtime `node:22-alpine` dengan user non-root, `tini` sebagai PID 1, dan `HEALTHCHECK`.
- **Konfigurasi `NEXT_PUBLIC_*` masuk sebagai `--build-arg`.** Next meng-inline nilainya ke bundle saat build, jadi satu image = satu konfigurasi environment.
- **`NEXT_PUBLIC_API_MOCKING` default kosong di Dockerfile**, sehingga kode MSW dilipat keluar dari bundle produksi.
- **`NEXT_DEPLOYMENT_ID` (mis. SHA commit) dioper saat build** untuk proteksi version skew.
- **`/api/health`** dinamis, `no-store`, dan tidak memanggil BE, supaya gangguan BE tidak membuat orkestrator membunuh container yang masih bisa melayani Home dari cache.

## Konsekuensi

- **Positif**: satu artefak immutable per environment, dan rollback cukup dengan mengganti tag image.
- **Negatif**: cache `use cache` tersimpan in-memory per instance, jadi status Home antar replica bisa berbeda sampai satu interval revalidate.
- **Negatif**: `next build` mem-prerender Home dengan memanggil `NEXT_PUBLIC_API_BASE_URL`. Tanpa backend yang bisa dijangkau dari build, Home ter-bake dengan state error sampai revalidate pertama (ADR-0007).
- **Negatif**: Poppins masih lewat `next/font/google`, jadi `docker build` butuh akses ke Google Fonts dan bisa gagal di jaringan tertutup. Keputusan lama memakai font self-hosted; file-nya belum dipulihkan.
- **Yang harus dijaga**:
  - Job `image` di CI membangun image, gagal bila ukurannya di atas 300 MB, dan menjalankan smoke test `/api/health` dan Home.
  - Setiap `NEXT_PUBLIC_*` di `.env.example` harus punya `ARG` di `Dockerfile`. Dicek job `image`.
  - Route `/` tetap statis di log build (job `check`, ADR-0007).
