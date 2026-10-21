# ADR-0007: Strategi rendering per halaman

- **Status**: Proposed
- **Tanggal**: 2026-10-18
- **Pengambil keputusan**: Tim FE Web
- **Requirement terkait**: FR-01–05, NFR-01, NFR-03, NFR-06, NFR-07

## Konteks

Flash crowd pertama kali menghantam Home. Kalau Home dirender dinamis per request, origin ikut tumbang sebelum waiting room sempat melindungi apa pun. Di sisi lain, Detail dan Payment harus dijaga token dan tidak boleh di-cache.

## Keputusan

| Halaman | Strategi | Alasan |
|---|---|---|
| Home | Server Component, static + ISR (revalidate pendek, usulan 15 detik), di-cache CDN | Menyerap lonjakan tanpa menyentuh origin. Status event boleh terlambat beberapa detik. |
| Login | Server Component + form client | Standar |
| Waiting Room | Shell statis + Client Component dengan polling | Shell dari CDN, hanya endpoint posisi yang dinamis |
| Detail Ticket | Dinamis, dijaga `proxy.ts` | Butuh access token, tidak boleh di-cache |
| Payment (web dan embed) | Dinamis, dijaga `proxy.ts` | Sama |
| E-tiket | Dinamis, butuh login | Data pribadi |
| Fallback | Halaman statis `/maintenance` dari CDN | NFR-01: tetap ada tampilan saat backend bermasalah |

- **`proxy.ts` (di Next 16 menggantikan `middleware.ts`) memverifikasi tanda tangan access token** (JWT, verifikasi di edge) sebelum route `/events/*/book` dan `/orders/*/pay`. Tanpa token valid, user diarahkan ke Waiting Room. Verifikasi final tetap di BE.
- **Provider client (TanStack Query, session) hanya dipasang di layout route yang membutuhkan**, tidak di root layout, supaya Home tetap statis.

## Konsekuensi

- **Positif**: Home bertahan saat lonjakan. Token gate di edge mencegah bypass antrian murah sebelum request sampai ke BE.
- **Negatif**: status Home bisa terlambat sampai satu interval revalidate. Tombol "Beli" tetap divalidasi ulang oleh queue service.
- **Yang harus dijaga**: Lighthouse/bundle check di CI bahwa Home tidak berubah menjadi dynamic route.

## Catatan implementasi (2026-10-19)

- Next 16 mengganti nama konvensi `middleware.ts` menjadi `proxy.ts`. Perilaku yang diputuskan di atas tidak berubah.
- `proxy.ts` saat ini **baru memeriksa keberadaan cookie `access_token`**. Verifikasi tanda tangan JWT di edge belum dipasang.
- Home memakai `use cache` dengan `cacheLife({ stale: 60, revalidate: 15, expire: 600 })`. `revalidate: 15` saja tidak cukup: `stale` di bawah 30 detik atau `expire` di bawah 5 menit membuat Home keluar dari static shell.
- `next build` tanpa backend yang bisa dijangkau membuat Home ter-prerender dengan state error sampai revalidate berikutnya.
- Variabel `NEXT_PUBLIC_API_MOCKING` selalu didefinisikan di `next.config.ts` (kosong bila mati) agar kode mock dilipat dari bundle produksi. Dicek dengan membandingkan chunk build dengan dan tanpa mock.
- CI (`.github/workflows/ci.yml`) menjalankan `pnpm build` dan gagal bila `/` tidak muncul sebagai route statis (`○`), sesuai butir "Yang harus dijaga" di atas.
