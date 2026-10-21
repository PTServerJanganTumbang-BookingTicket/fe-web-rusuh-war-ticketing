# Log Penggunaan AI

Sesuai aturan evaluasi #5, penggunaan AI tools dicatat di sini dan tidak dihapus. Setiap entri berisi tanggal, tool, tujuan, input, output, dan apa yang direview atau diubah manusia.

## Format entri

```
## YYYY-MM-DD — <judul singkat>
- **Tool**: <nama tool / model>
- **Oleh**: <nama anggota tim>
- **Tujuan**: <apa yang diminta>
- **Input**: <dokumen/konteks yang diberikan>
- **Output**: <file atau keputusan yang dihasilkan>
- **Review manusia**: <apa yang diperiksa, diubah, atau ditolak>
```

---

## 2026-10-12 s.d. 2026-10-13 — Analisis requirement

- **Tool**: Claude (claude.ai)
- **Oleh**: Ahmad Muzaki
- **Tujuan**: Menganalisis dokumen requirement v1.0 dan versi tender terbaru, mencari celah dan kontradiksi, menyusun pertanyaan klarifikasi.
- **Input**: `Requirement-Rusuh-Booking-Tiket.html`, `Tender_Rusuh_Booking_Ticket.pdf`.
- **Output**: Daftar kontradiksi (NIK wajib vs fallback per sesi, overlap TTL booking dan pembayaran, pembayaran telat), daftar pertanyaan ke klien.
- **Review manusia**: Pertanyaan disaring dan dikirim ke klien; sebagian sudah dijawab (login wajib, Midtrans sandbox, popup saat stok habis, stack Next.js + Signal DS + Tailwind).

## 2026-10-14 — Pertanyaan khusus FE

- **Tool**: Claude (claude.ai)
- **Oleh**: Ahmad Muzaki
- **Tujuan**: Menyusun pertanyaan dari sudut pandang FE Web dan kontrak yang perlu disepakati dengan BE dan Mobile.
- **Output**: Pertanyaan per halaman, daftar kesepakatan internal (OpenAPI, `expiresAt`, error code, kontrak WebView).
- **Review manusia**: Dipakai sebagai bahan sesi tanya jawab dengan klien.

## 2026-10-18 — Desain codebase FE dan dokumentasi

- **Tool**: Claude (claude.ai)
- **Oleh**: Ahmad Muzaki
- **Tujuan**: Merancang separation of concerns dan struktur codebase FE untuk paparan tim, membandingkan usulan MVVM berbasis class dengan ViewModel sebagai custom hook, menyusun ADR, steering, dan skill.
- **Input**: Dokumen tender, jawaban klien, posisi tim tentang MVVM rigid.
- **Output**: `docs/architecture/overview.md`, ADR-0001 s.d. ADR-0009, `docs/ai/steering/*`, `docs/ai/skills/*`, file ini.
- **Review manusia**: Semua ADR berstatus Proposed dan akan dibahas di paparan tim 2026-10-19. Library yang dipakai perlu dicek terhadap tech radar.

## 2026-10-19 — Inisialisasi repo (pnpm workspace + Next.js)

- **Tool**: Claude Code (Sonnet 5.5)
- **Oleh**: (isi nama anggota tim yang menjalankan sesi)
- **Tujuan**: Inisialisasi repo dengan Next.js dan pnpm sesuai ADR-0001 dan struktur di `docs/architecture/overview.md`.
- **Input**: `AGENTS.md`, steering, ADR-0001, ADR-0007, overview.
- **Output**: `pnpm-workspace.yaml`, `package.json` root, `apps/web` (create-next-app: TS, Tailwind, ESLint, App Router), stub `packages/{core,ui,api,i18n,config}`, `mocks/`.
- **Review manusia**: Perlu dicek: Turborepo belum dipasang (menunggu tech radar), Signal DS belum diinstal, ESLint boundaries dan `strict` tambahan (`noUncheckedIndexedAccess`) belum diaktifkan, route belum dipindah ke struktur `(public)`.

## 2026-10-19 — Tooling dasar: strictness, boundaries, Vitest

- **Tool**: Claude Code (Sonnet 5.5)
- **Oleh**: (isi nama anggota tim yang menjalankan sesi)
- **Tujuan**: Mengaktifkan `noUncheckedIndexedAccess`, menegakkan aturan dependensi ADR-0002 lewat ESLint, dan memasang Vitest.
- **Output**: `packages/config` (tsconfig base, `eslint/boundaries.mjs`), `eslint.config.mjs` root, `vitest.config.ts`, tsconfig per package. Signal DS sengaja belum dipasang.
- **Review manusia**: Rule `boundaries` diuji dengan impor yang melanggar (core→react, ui→core, api→ui, app→core). Perlu dicek: tabel ADR-0002 melarang `ui` mengimpor `core` kecuali tipe, saat ini semua impor `core` dari `ui` diblokir. Belum ada test, belum ada CI.

## 2026-10-19 — Struktur minimum dan integrasi untuk paparan tim

- **Tool**: Claude Code (Sonnet 5.5)
- **Oleh**: (isi nama anggota tim yang menjalankan sesi)
- **Tujuan**: Menyiapkan struktur minimum dan satu alur terintegrasi (Home dan Waiting Room) untuk paparan tim.
- **Input**: Steering, ADR-0002/0003/0004/0007/0009, dokumentasi Next 16 di `node_modules`.
- **Output**: `core` (AppError, remainingMs, withJitter, canAddTicket) dengan test, `i18n`, `api` (client zod, adapter, queryKeys, query options) dengan test MSW, `mocks` (MSW node + browser, skenario), `ui` (HomeView, QueueView), `features` (catalog, queue, shared), route sesuai overview, `proxy.ts`, `/api/session/exchange`, README.
- **Review manusia**: Perlu dicek: (1) Next 16 mengganti `middleware.ts` menjadi `proxy.ts`, ADR-0007 masih menyebut middleware; (2) proxy baru memeriksa keberadaan cookie, verifikasi JWT belum ada; (3) kontrak API di `mocks` dan adapter ditulis tangan, belum dari OpenAPI; (4) `ui` tidak memakai Signal DS; (5) `next build` tanpa backend akan mem-bake state error Home sampai revalidate 15 dtk; (6) Home memakai Container async (bukan hook) karena Server Component; (7) dev overlay Next menampilkan insight "URL data outside Suspense" untuk `/` yang belum diselidiki; (8) belum ada Storybook, Playwright, state machine booking, countdown, offset jam server.

## 2026-10-19 — Cleanup repo dan koreksi dokumentasi

- **Tool**: Claude Code (Sonnet 5.5)
- **Oleh**: (isi nama anggota tim yang menjalankan sesi)
- **Tujuan**: Membersihkan file sisa dan menyelaraskan dokumentasi dengan implementasi.
- **Output**: Hapus `.DS_Store` dan `tsconfig.tsbuildinfo`, ganti `apps/web/README.md` bawaan create-next-app. Koreksi `middleware.ts` → `proxy.ts` (overview, ADR-0007, skill), tambah catatan implementasi di ADR-0001, 0007, 0008, bagian status di overview, dan catatan tooling di testing.md. Tidak ada isi `docs/ai/` yang dihapus atau dipangkas.
- **Review manusia**: Perlu diputuskan tim: pemisahan `/api/session/exchange` (ADR-0008), dan apakah `ui` boleh mengimpor tipe dari `core` (ADR-0002 mengizinkan, aturan ESLint saat ini memblokir semua impor `core` dari `ui`).

## 2026-10-19 — Perbaikan insight "URL data outside Suspense" dan mock browser

- **Tool**: Claude Code (Sonnet 5.5)
- **Oleh**: (isi nama anggota tim yang menjalankan sesi)
- **Tujuan**: Menghilangkan error Next dev pada route `/` dan error validasi instant pada Waiting Room.
- **Output**: `HomeContainer` dibungkus `<Suspense>` di `app/(public)/page.tsx`; layout queue dibungkus `<Suspense>`; `AppProviders` menahan query lewat `onlineManager` sampai worker MSW siap (children tetap dirender); `startWorker` idempoten dan mengimpor `msw/browser` dinamis; alias Turbopack untuk `msw/browser` di `next.config.ts`.
- **Review manusia**: Perlu dicek: bagaimana Home di build produksi dengan backend asli (static shell hanya berisi fallback bila cache belum hangat), dan apakah alias `msw/browser` yang bergantung pada path `../../mocks` perlu dibuat lebih tahan perubahan struktur.

## 2026-10-19 — Menutup dua ketidaksesuaian dokumen dan kode

- **Tool**: Claude Code (Sonnet 5.5)
- **Oleh**: (isi nama anggota tim yang menjalankan sesi)
- **Tujuan**: Menyelesaikan dua hal yang ditandai di entri cleanup: route session dan impor tipe `ui` dari `core`.
- **Output**: `/api/session/exchange` dipecah: route web menjadi `/api/session/start` (adapter `startSession` diperbarui), `/exchange` tetap dicadangkan untuk one-time code WebView dan belum dibuat. Aturan ESLint boundaries kini mengizinkan `import type` dari `core` di `ui` dan tetap memblokir impor nilai (diuji dengan dua file probe). README, overview, dan catatan ADR-0008 diperbarui.
- **Review manusia**: Perlu dicek: `ui` yang mengimpor tipe `core` perlu `@rusuh/core` di `package.json`-nya saat pertama dipakai. Isi route `/exchange` menunggu kontrak BE.

## 2026-10-19 — ADR login satu sesi dan persistensi progres

- **Tool**: Claude Code (Sonnet 5.5)
- **Oleh**: (isi nama anggota tim yang menjalankan sesi)
- **Tujuan**: Mendokumentasikan keputusan login satu sesi aktif (login terakhir menang) dengan progres antrian, booking, dan pembayaran tetap tersimpan lintas perangkat.
- **Output**: `docs/adr/0010-login-single-session-progress-persistence.md`, baris di `docs/adr/README.md` dan di tabel kontrak `overview.md`. Tidak ada perubahan kode.
- **Review manusia**: Perlu dikonfirmasi: kode error `SESSION_REVOKED` dan kontrak `sid` dengan BE, aturan lintas app mobile dan web, serta apakah perilaku ini sudah disetujui klien (ADR memakai requirement login wajib dan prinsip "Jangan PHP", bukan ID requirement khusus).

## 2026-10-19 — ADR NIK terikat akun dan jawaban untuk ADR-0010

- **Tool**: Claude Code (Sonnet 5.5)
- **Oleh**: (isi nama anggota tim yang menjalankan sesi)
- **Tujuan**: Mencatat keputusan tim: NIK terikat ke akun dan terisi otomatis, batas 3 tiket ditegakkan, login app mobile mengeluarkan sesi web dan sebaliknya.
- **Output**: `docs/adr/0011-nik-linked-to-account.md`, pembaruan ADR-0010 (pertanyaan terbuka yang sudah dijawab), `docs/adr/README.md`, tabel kontrak `overview.md`, baris Detail Ticket dan usulan tim di `docs/ai/steering/product.md`. Tidak ada perubahan kode.
- **Review manusia**: Perlu dikonfirmasi klien. Kode `canAddTicket` belum disesuaikan: `activeBooked` perlu bersumber dari kuota server saat layar Detail Ticket dibangun. Belum diputuskan: NIK diisi saat pendaftaran atau booking pertama, dan apakah NIK bisa diubah.

## 2026-10-19 — Dummy Pilih Tiket dari wireframe

- **Tool**: Claude Code (Sonnet 5.5)
- **Oleh**: (isi nama anggota tim yang menjalankan sesi)
- **Tujuan**: Membuat dummy layar Detail Ticket mengikuti wireframe 9.3 (screenshot yang diberikan), dengan pola ViewModel hook + Container + View.
- **Input**: Screenshot wireframe 9.1–9.5, ADR-0002/0003/0004/0005/0011.
- **Output**: `core` (`BookingSession`, `selectionReducer`, `totalPriceIdr`, `formatMmSs`) dengan test, adapter dan query booking di `api` dengan test MSW, handler `booking-session` dan skenario `booking-expiring` di `mocks`, `BookingView`, `CategoryRow`, `StatusView` di `ui`, `useBookingViewModel`, `toBookingViewProps`, `useCountdown` di `features`, route `/events/[eventId]/book`. Aksen tombol di Home dan Waiting Room diganti ungu agar konsisten dengan wireframe.
- **Review manusia**: Penyimpangan dari wireframe: field NIK hanya-baca dan tersamar (ADR-0011, wireframe masih input). "Tombol Lanjut ke Pembayaran" belum memanggil endpoint booking. Wireframe 9.4 (Payment) dan 9.5 (status pasca-bayar) belum dibangun. Belum ada popup stok habis saat submit dan layar slot diambil alih.

## 2026-10-19 — Koreksi: wireframe hanya referensi struktur, bukan desain visual

- **Tool**: Claude Code (Sonnet 5.5)
- **Oleh**: (isi nama anggota tim yang menjalankan sesi)
- **Tujuan**: Memperbaiki kesalahan: dummy Pilih Tiket meniru tampilan wireframe low-fi (ungu, garis putus-putus), padahal wireframe hanya referensi struktur dan target visual adalah Telkomsel Signal DS.
- **Output**: Semua warna di `packages/ui` diganti token semantik (`bg-primary`, `text-muted`, `bg-danger-subtle`, dst.). Nilai token didefinisikan di `apps/web/app/globals.css` sebagai placeholder sementara. Garis putus-putus dan aksen ungu dihapus.
- **Review manusia**: Nilai token BUKAN nilai Signal DS. Signal DS belum bisa diakses (tidak ditemukan di web publik), jadi komponen belum memakai komponen atau preset Signal. Perlu akses ke paket atau repo Signal untuk mengganti `Button`, `Card`, `Badge`, dll. dan menyelaraskan token.

## 2026-10-19 — Sisa kuota n/3, label kategori, redirect saat waktu habis

- **Tool**: Claude Code (Sonnet 5.5)
- **Oleh**: (isi nama anggota tim yang menjalankan sesi)
- **Tujuan**: Menampilkan sisa kuota "n/3" di kartu NIK, menghapus "(maks. 3 tiket per NIK)" dari label kategori, dan mengembalikan customer ke Waiting Room saat waktu booking habis, dengan toggle untuk pengujian.
- **Output**: Hint NIK memakai `quota.max - quota.used - tiket terpilih`; label kategori menjadi "Pilih kategori"; `useBookingViewModel` me-redirect ke queue setelah server menjawab `ACCESS_EXPIRED` (toggle `NEXT_PUBLIC_BOOKING_EXPIRY=queue|screen`); mock booking tetap 410 setelah expired dan antrian direset; catatan implementasi di ADR-0005.
- **Review manusia**: Mode `queue` diuji end-to-end di browser dengan skenario `booking-expiring`. Mode `screen` tidak diuji ulang setelah perubahan ini. Belum ada test untuk ViewModel (perlu Testing Library).

## 2026-10-19 — Home dan Ruang Tunggu mengikuti struktur wireframe 9.1 dan 9.2

- **Tool**: Claude Code (Sonnet 5.5)
- **Oleh**: (isi nama anggota tim yang menjalankan sesi)
- **Tujuan**: Menyelaraskan struktur dan isi Home dan Ruang Tunggu dengan wireframe. Visual tetap memakai token placeholder, bukan meniru wireframe (target visual adalah Signal DS).
- **Output**: `ScreenFrame` bersama (dipakai Home, Ruang Tunggu, Detail Ticket). Home: header dengan Login, "Daftar Event", kartu dengan badge AVAILABLE/SOLD OUT, tanggal dan venue, "Beli Tiket →" atau "Tidak Tersedia" nonaktif. Ruang Tunggu: nama event di header, posisi "#1.248", estimasi "± 4 menit", progress bar, catatan jangan tutup halaman, dan masuk otomatis saat giliran tiba. Kontrak queue ditambah `eventName` dan `joinedPosition`; `queueProgressPercent` di `core`; data mock disesuaikan (Konser A/B/C).
- **Review manusia**: Kontrak queue (`joinedPosition`, `eventName`) usulan FE, perlu disepakati dengan BE. Hamburger menu di header Home belum ada. Label badge mengikuti wireframe (bahasa Inggris), perlu dikonfirmasi tim.

## 2026-10-19 — Mock Pembayaran dengan QR contoh dan simulasi berhasil/gagal

- **Tool**: Claude Code (Sonnet 5.5)
- **Oleh**: (isi nama anggota tim yang menjalankan sesi)
- **Tujuan**: Membuat mock layar Pembayaran (wireframe 9.4) dan status akhir (9.5) dengan QR palsu dan dua tombol simulasi berhasil dan gagal.
- **Output**: `core` (tipe `Order`, `PaymentInstruction`, `PaymentMethod`), `api` (`getOrder`, `startPayment`, `emulatePaymentOutcome`, `orderQuery`), handler MSW (`/orders/:id`, `/orders/:id/payment`, `/mock/orders/:id/outcome`, skenario `payment-expiring`), `ui` (`PaymentView`, `PaymentResultView`, `FakeQr`, `CountdownCard`, `ScreenFrame` dengan tone), `features/payment` (`usePaymentViewModel`, `toPaymentViewProps`, test), hook `useAskServerAtExpiry` yang dipakai Booking dan Payment, route web dan embed. Catatan implementasi di ADR-0006.
- **Review manusia**: Alur sukses dan gagal diuji di browser (E-Wallet lalu berhasil, Virtual Account lalu gagal). Alur expired payment dan tombol Salin belum diuji di browser. QR hanyalah pola acak deterministik, tidak bisa dipindai. Kontrak order dan instruksi usulan FE, perlu disepakati dengan BE. Tombol "Lihat E-Tiket" menuju placeholder.

## 2026-10-19 — Penyempurnaan standar dan implementasi

- **Tool**: Claude Code (Sonnet 5.5)
- **Oleh**: (isi nama anggota tim yang menjalankan sesi)
- **Tujuan**: Menutup temuan laporan kepatuhan struktur: pelanggaran kecil di kode dan standar yang belum tertulis.
- **Output**: `@rusuh/mocks` pindah ke devDependencies `api`, dependensi `core` yang tidak terpakai dihapus dari `i18n`, `FakeQr` memakai token, cast tak perlu dihapus. ESLint baru: larangan hex di `ui` dan pembatasan impor mock. Kode mock dikeluarkan dari bundle produksi (diverifikasi: 0 chunk tanpa mock, 2 chunk dengan mock). Test ViewModel Queue, Booking, Payment dengan Testing Library (70 test total). Workflow CI dan skrip `pnpm check`. Komentar requirement di ViewModel. Steering (`architecture-rules`, `coding-conventions`, `testing`), skill `new-feature-screen` dan `new-ui-component`, catatan di ADR-0002/0003/0004/0007, status di `overview.md`.
- **Review manusia**: Rujukan requirement Payment tidak selaras: overview menulis FR-20–25 dan BR-05–06, wireframe 9.4 menulis FR-16–20 dan BR-02. Perlu dicek ke dokumen requirement. Belum dikerjakan: Storybook, Playwright, reducer state machine booking, verifikasi JWT, Signal DS, git init. CI belum pernah dijalankan.

## 2026-10-19 — Signal DS (token, tipografi, primitif, layout) dan Playwright

- **Tool**: Claude Code (Sonnet 5.5)
- **Oleh**: (isi nama anggota tim yang menjalankan sesi)
- **Tujuan**: Menerapkan Signal DS pada layout dan primitif, dan memasang Playwright dengan jam palsu.
- **Input**: Implementasi referensi internal Signal DS milik tim (token, font, skala tipografi, primitif shadcn, pola `AuthLayout`/`KioskLayout`).
- **Output**: Preset `packages/config/tailwind/signal.css`, font Poppins dan Telkomsel Batik Sans, primitif `Button`, `Badge`, `Card`, `Alert`, `Progress`, `RadioGroup` di `packages/ui`, semua view dan `ScreenFrame` dimigrasi, ADR-0012. Playwright (`apps/web/e2e`, 11 tes lulus, 2 `test.fixme`), job e2e di CI, skrip `pnpm test:e2e`.
- **Review manusia**: Token Signal berasal dari repo referensi, bukan paket resmi, jadi perlu diverifikasi. Font Telkomsel Batik Sans disalin dari repo referensi: konfirmasi izin redistribusi. Playwright lokal memakai Chrome terpasang; job e2e di CI belum pernah dijalankan. Radix `RadioGroup` mengubah role radio; tes diperbarui mengikuti. Dua skenario E2E (stok habis saat submit, slot diambil alih) menunggu fiturnya. Sempat mencoba melempar error Home keluar dari `use cache` agar tidak di-cache, tetapi itu menggagalkan prerender build tanpa backend, jadi dikembalikan: error tetap ditangkap di dalam, dan ISR 15 detik yang menggantinya.

## 2026-10-21 — Packaging satu container image

- **Tool**: Claude (claude.ai)
- **Oleh**: Ahmad Muzaki
- **Tujuan**: Mengemas monorepo FE menjadi satu container image dan mengintegrasikannya ke repo.
- **Input**: Repo ini, dokumentasi Next 16 di `node_modules/next/dist/docs` (`output`, `self-hosting`, `deploymentId`, environment variables), draf Dockerfile dari sesi analisis 2026-10-18.
- **Output**: `Dockerfile` (pnpm fetch → install offline → build → runtime alpine non-root dengan tini dan HEALTHCHECK), `.dockerignore`, `output: "standalone"` + `outputFileTracingRoot` + `poweredByHeader: false` di `next.config.ts`, route `/api/health`, Poppins di-self-host lewat `next/font/local` (berlisensi OFL), job CI `image` (cek ARG flag build, build, batas ukuran 300 MB, smoke test container), ADR-0013, README, aturan steering untuk flag `NEXT_PUBLIC_*` dan larangan unduhan aset saat build.
- **Review manusia**: Draf awal menomori ADR ini 0010 dan memakai Turborepo. Disesuaikan karena 0010–0012 sudah terpakai dan repo belum memakai Turborepo. `next/font/google` diganti karena build gagal tanpa akses ke Google Fonts. `pnpm check` hijau (70 test). Langkah Dockerfile diverifikasi di salinan bersih repo, tetapi `docker build` penuh belum: Docker Hub tidak terjangkau dari lingkungan sesi. Job `image` di CI menjadi verifikasi pertama. Perlu diputuskan tim: apakah satu image per environment cukup, atau perlu konfigurasi runtime (lihat "Pekerjaan lanjutan" di ADR-0013).
