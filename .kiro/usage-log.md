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
- **Oleh**: Stradivary
- **Tujuan**: Inisialisasi repo dengan Next.js dan pnpm sesuai ADR-0001 dan struktur di `docs/architecture/overview.md`.
- **Input**: `AGENTS.md`, steering, ADR-0001, ADR-0007, overview.
- **Output**: `pnpm-workspace.yaml`, `package.json` root, `apps/web` (create-next-app: TS, Tailwind, ESLint, App Router), stub `packages/{core,ui,api,i18n,config}`, `mocks/`.
- **Review manusia**: Perlu dicek: Turborepo belum dipasang (menunggu tech radar), Signal DS belum diinstal, ESLint boundaries dan `strict` tambahan (`noUncheckedIndexedAccess`) belum diaktifkan, route belum dipindah ke struktur `(public)`.

## 2026-10-19 — Tooling dasar: strictness, boundaries, Vitest

- **Tool**: Claude Code (Sonnet 5.5)
- **Oleh**: Stradivary
- **Tujuan**: Mengaktifkan `noUncheckedIndexedAccess`, menegakkan aturan dependensi ADR-0002 lewat ESLint, dan memasang Vitest.
- **Output**: `packages/config` (tsconfig base, `eslint/boundaries.mjs`), `eslint.config.mjs` root, `vitest.config.ts`, tsconfig per package. Signal DS sengaja belum dipasang.
- **Review manusia**: Rule `boundaries` diuji dengan impor yang melanggar (core→react, ui→core, api→ui, app→core). Perlu dicek: tabel ADR-0002 melarang `ui` mengimpor `core` kecuali tipe, saat ini semua impor `core` dari `ui` diblokir. Belum ada test, belum ada CI.

## 2026-10-19 — Struktur minimum dan integrasi untuk paparan tim

- **Tool**: Claude Code (Sonnet 5.5)
- **Oleh**: Stradivary
- **Tujuan**: Menyiapkan struktur minimum dan satu alur terintegrasi (Home dan Waiting Room) untuk paparan tim.
- **Input**: Steering, ADR-0002/0003/0004/0007/0009, dokumentasi Next 16 di `node_modules`.
- **Output**: `core` (AppError, remainingMs, withJitter, canAddTicket) dengan test, `i18n`, `api` (client zod, adapter, queryKeys, query options) dengan test MSW, `mocks` (MSW node + browser, skenario), `ui` (HomeView, QueueView), `features` (catalog, queue, shared), route sesuai overview, `proxy.ts`, `/api/session/exchange`, README.
- **Review manusia**: Perlu dicek: (1) Next 16 mengganti `middleware.ts` menjadi `proxy.ts`, ADR-0007 masih menyebut middleware; (2) proxy baru memeriksa keberadaan cookie, verifikasi JWT belum ada; (3) kontrak API di `mocks` dan adapter ditulis tangan, belum dari OpenAPI; (4) `ui` tidak memakai Signal DS; (5) `next build` tanpa backend akan mem-bake state error Home sampai revalidate 15 dtk; (6) Home memakai Container async (bukan hook) karena Server Component; (7) dev overlay Next menampilkan insight "URL data outside Suspense" untuk `/` yang belum diselidiki; (8) belum ada Storybook, Playwright, state machine booking, countdown, offset jam server.

## 2026-10-19 — Cleanup repo dan koreksi dokumentasi

- **Tool**: Claude Code (Sonnet 5.5)
- **Oleh**: Stradivary
- **Tujuan**: Membersihkan file sisa dan menyelaraskan dokumentasi dengan implementasi.
- **Output**: Hapus `.DS_Store` dan `tsconfig.tsbuildinfo`, ganti `apps/web/README.md` bawaan create-next-app. Koreksi `middleware.ts` → `proxy.ts` (overview, ADR-0007, skill), tambah catatan implementasi di ADR-0001, 0007, 0008, bagian status di overview, dan catatan tooling di testing.md. Tidak ada isi `docs/ai/` yang dihapus atau dipangkas.
- **Review manusia**: Perlu diputuskan tim: pemisahan `/api/session/exchange` (ADR-0008), dan apakah `ui` boleh mengimpor tipe dari `core` (ADR-0002 mengizinkan, aturan ESLint saat ini memblokir semua impor `core` dari `ui`).

## 2026-10-19 — Perbaikan insight "URL data outside Suspense" dan mock browser

- **Tool**: Claude Code (Sonnet 5.5)
- **Oleh**: Stradivary
- **Tujuan**: Menghilangkan error Next dev pada route `/` dan error validasi instant pada Waiting Room.
- **Output**: `HomeContainer` dibungkus `<Suspense>` di `app/(public)/page.tsx`; layout queue dibungkus `<Suspense>`; `AppProviders` menahan query lewat `onlineManager` sampai worker MSW siap (children tetap dirender); `startWorker` idempoten dan mengimpor `msw/browser` dinamis; alias Turbopack untuk `msw/browser` di `next.config.ts`.
- **Review manusia**: Perlu dicek: bagaimana Home di build produksi dengan backend asli (static shell hanya berisi fallback bila cache belum hangat), dan apakah alias `msw/browser` yang bergantung pada path `../../mocks` perlu dibuat lebih tahan perubahan struktur.

## 2026-10-19 — Menutup dua ketidaksesuaian dokumen dan kode

- **Tool**: Claude Code (Sonnet 5.5)
- **Oleh**: Stradivary
- **Tujuan**: Menyelesaikan dua hal yang ditandai di entri cleanup: route session dan impor tipe `ui` dari `core`.
- **Output**: `/api/session/exchange` dipecah: route web menjadi `/api/session/start` (adapter `startSession` diperbarui), `/exchange` tetap dicadangkan untuk one-time code WebView dan belum dibuat. Aturan ESLint boundaries kini mengizinkan `import type` dari `core` di `ui` dan tetap memblokir impor nilai (diuji dengan dua file probe). README, overview, dan catatan ADR-0008 diperbarui.
- **Review manusia**: Perlu dicek: `ui` yang mengimpor tipe `core` perlu `@rusuh/core` di `package.json`-nya saat pertama dipakai. Isi route `/exchange` menunggu kontrak BE.

## 2026-10-19 — ADR login satu sesi dan persistensi progres

- **Tool**: Claude Code (Sonnet 5.5)
- **Oleh**: Stradivary
- **Tujuan**: Mendokumentasikan keputusan login satu sesi aktif (login terakhir menang) dengan progres antrian, booking, dan pembayaran tetap tersimpan lintas perangkat.
- **Output**: `docs/adr/0010-login-single-session-progress-persistence.md`, baris di `docs/adr/README.md` dan di tabel kontrak `overview.md`. Tidak ada perubahan kode.
- **Review manusia**: Perlu dikonfirmasi: kode error `SESSION_REVOKED` dan kontrak `sid` dengan BE, aturan lintas app mobile dan web, serta apakah perilaku ini sudah disetujui klien (ADR memakai requirement login wajib dan prinsip "Jangan PHP", bukan ID requirement khusus).

## 2026-10-19 — ADR NIK terikat akun dan jawaban untuk ADR-0010

- **Tool**: Claude Code (Sonnet 5.5)
- **Oleh**: Stradivary
- **Tujuan**: Mencatat keputusan tim: NIK terikat ke akun dan terisi otomatis, batas 3 tiket ditegakkan, login app mobile mengeluarkan sesi web dan sebaliknya.
- **Output**: `docs/adr/0011-nik-linked-to-account.md`, pembaruan ADR-0010 (pertanyaan terbuka yang sudah dijawab), `docs/adr/README.md`, tabel kontrak `overview.md`, baris Detail Ticket dan usulan tim di `docs/ai/steering/product.md`. Tidak ada perubahan kode.
- **Review manusia**: Perlu dikonfirmasi klien. Kode `canAddTicket` belum disesuaikan: `activeBooked` perlu bersumber dari kuota server saat layar Detail Ticket dibangun. Belum diputuskan: NIK diisi saat pendaftaran atau booking pertama, dan apakah NIK bisa diubah.

## 2026-10-19 — Dummy Pilih Tiket dari wireframe

- **Tool**: Claude Code (Sonnet 5.5)
- **Oleh**: Stradivary
- **Tujuan**: Membuat dummy layar Detail Ticket mengikuti wireframe 9.3 (screenshot yang diberikan), dengan pola ViewModel hook + Container + View.
- **Input**: Screenshot wireframe 9.1–9.5, ADR-0002/0003/0004/0005/0011.
- **Output**: `core` (`BookingSession`, `selectionReducer`, `totalPriceIdr`, `formatMmSs`) dengan test, adapter dan query booking di `api` dengan test MSW, handler `booking-session` dan skenario `booking-expiring` di `mocks`, `BookingView`, `CategoryRow`, `StatusView` di `ui`, `useBookingViewModel`, `toBookingViewProps`, `useCountdown` di `features`, route `/events/[eventId]/book`. Aksen tombol di Home dan Waiting Room diganti ungu agar konsisten dengan wireframe.
- **Review manusia**: Penyimpangan dari wireframe: field NIK hanya-baca dan tersamar (ADR-0011, wireframe masih input). "Tombol Lanjut ke Pembayaran" belum memanggil endpoint booking. Wireframe 9.4 (Payment) dan 9.5 (status pasca-bayar) belum dibangun. Belum ada popup stok habis saat submit dan layar slot diambil alih.

## 2026-10-19 — Koreksi: wireframe hanya referensi struktur, bukan desain visual

- **Tool**: Claude Code (Sonnet 5.5)
- **Oleh**: Stradivary
- **Tujuan**: Memperbaiki kesalahan: dummy Pilih Tiket meniru tampilan wireframe low-fi (ungu, garis putus-putus), padahal wireframe hanya referensi struktur dan target visual adalah Telkomsel Signal DS.
- **Output**: Semua warna di `packages/ui` diganti token semantik (`bg-primary`, `text-muted`, `bg-danger-subtle`, dst.). Nilai token didefinisikan di `apps/web/app/globals.css` sebagai placeholder sementara. Garis putus-putus dan aksen ungu dihapus.
- **Review manusia**: Nilai token BUKAN nilai Signal DS. Signal DS belum bisa diakses (tidak ditemukan di web publik), jadi komponen belum memakai komponen atau preset Signal. Perlu akses ke paket atau repo Signal untuk mengganti `Button`, `Card`, `Badge`, dll. dan menyelaraskan token.

## 2026-10-19 — Sisa kuota n/3, label kategori, redirect saat waktu habis

- **Tool**: Claude Code (Sonnet 5.5)
- **Oleh**: Stradivary
- **Tujuan**: Menampilkan sisa kuota "n/3" di kartu NIK, menghapus "(maks. 3 tiket per NIK)" dari label kategori, dan mengembalikan customer ke Waiting Room saat waktu booking habis, dengan toggle untuk pengujian.
- **Output**: Hint NIK memakai `quota.max - quota.used - tiket terpilih`; label kategori menjadi "Pilih kategori"; `useBookingViewModel` me-redirect ke queue setelah server menjawab `ACCESS_EXPIRED` (toggle `NEXT_PUBLIC_BOOKING_EXPIRY=queue|screen`); mock booking tetap 410 setelah expired dan antrian direset; catatan implementasi di ADR-0005.
- **Review manusia**: Mode `queue` diuji end-to-end di browser dengan skenario `booking-expiring`. Mode `screen` tidak diuji ulang setelah perubahan ini. Belum ada test untuk ViewModel (perlu Testing Library).

## 2026-10-19 — Home dan Ruang Tunggu mengikuti struktur wireframe 9.1 dan 9.2

- **Tool**: Claude Code (Sonnet 5.5)
- **Oleh**: Stradivary
- **Tujuan**: Menyelaraskan struktur dan isi Home dan Ruang Tunggu dengan wireframe. Visual tetap memakai token placeholder, bukan meniru wireframe (target visual adalah Signal DS).
- **Output**: `ScreenFrame` bersama (dipakai Home, Ruang Tunggu, Detail Ticket). Home: header dengan Login, "Daftar Event", kartu dengan badge AVAILABLE/SOLD OUT, tanggal dan venue, "Beli Tiket →" atau "Tidak Tersedia" nonaktif. Ruang Tunggu: nama event di header, posisi "#1.248", estimasi "± 4 menit", progress bar, catatan jangan tutup halaman, dan masuk otomatis saat giliran tiba. Kontrak queue ditambah `eventName` dan `joinedPosition`; `queueProgressPercent` di `core`; data mock disesuaikan (Konser A/B/C).
- **Review manusia**: Kontrak queue (`joinedPosition`, `eventName`) usulan FE, perlu disepakati dengan BE. Hamburger menu di header Home belum ada. Label badge mengikuti wireframe (bahasa Inggris), perlu dikonfirmasi tim.

## 2026-10-19 — Mock Pembayaran dengan QR contoh dan simulasi berhasil/gagal

- **Tool**: Claude Code (Sonnet 5.5)
- **Oleh**: Stradivary
- **Tujuan**: Membuat mock layar Pembayaran (wireframe 9.4) dan status akhir (9.5) dengan QR palsu dan dua tombol simulasi berhasil dan gagal.
- **Output**: `core` (tipe `Order`, `PaymentInstruction`, `PaymentMethod`), `api` (`getOrder`, `startPayment`, `emulatePaymentOutcome`, `orderQuery`), handler MSW (`/orders/:id`, `/orders/:id/payment`, `/mock/orders/:id/outcome`, skenario `payment-expiring`), `ui` (`PaymentView`, `PaymentResultView`, `FakeQr`, `CountdownCard`, `ScreenFrame` dengan tone), `features/payment` (`usePaymentViewModel`, `toPaymentViewProps`, test), hook `useAskServerAtExpiry` yang dipakai Booking dan Payment, route web dan embed. Catatan implementasi di ADR-0006.
- **Review manusia**: Alur sukses dan gagal diuji di browser (E-Wallet lalu berhasil, Virtual Account lalu gagal). Alur expired payment dan tombol Salin belum diuji di browser. QR hanyalah pola acak deterministik, tidak bisa dipindai. Kontrak order dan instruksi usulan FE, perlu disepakati dengan BE. Tombol "Lihat E-Tiket" menuju placeholder.

## 2026-10-19 — Penyempurnaan standar dan implementasi

- **Tool**: Claude Code (Sonnet 5.5)
- **Oleh**: Stradivary
- **Tujuan**: Menutup temuan laporan kepatuhan struktur: pelanggaran kecil di kode dan standar yang belum tertulis.
- **Output**: `@rusuh/mocks` pindah ke devDependencies `api`, dependensi `core` yang tidak terpakai dihapus dari `i18n`, `FakeQr` memakai token, cast tak perlu dihapus. ESLint baru: larangan hex di `ui` dan pembatasan impor mock. Kode mock dikeluarkan dari bundle produksi (diverifikasi: 0 chunk tanpa mock, 2 chunk dengan mock). Test ViewModel Queue, Booking, Payment dengan Testing Library (70 test total). Workflow CI dan skrip `pnpm check`. Komentar requirement di ViewModel. Steering (`architecture-rules`, `coding-conventions`, `testing`), skill `new-feature-screen` dan `new-ui-component`, catatan di ADR-0002/0003/0004/0007, status di `overview.md`.
- **Review manusia**: Rujukan requirement Payment tidak selaras: overview menulis FR-20–25 dan BR-05–06, wireframe 9.4 menulis FR-16–20 dan BR-02. Perlu dicek ke dokumen requirement. Belum dikerjakan: Storybook, Playwright, reducer state machine booking, verifikasi JWT, Signal DS, git init. CI belum pernah dijalankan.

## 2026-10-19 — Signal DS (token, tipografi, primitif, layout) dan Playwright

- **Tool**: Claude Code (Sonnet 5.5)
- **Oleh**: Stradivary
- **Tujuan**: Menerapkan Signal DS pada layout dan primitif, dan memasang Playwright dengan jam palsu.
- **Input**: Implementasi referensi internal Signal DS milik tim (token, font, skala tipografi, primitif shadcn, pola `AuthLayout`/`KioskLayout`).
- **Output**: Preset `packages/config/tailwind/signal.css`, font Poppins dan Telkomsel Batik Sans, primitif `Button`, `Badge`, `Card`, `Alert`, `Progress`, `RadioGroup` di `packages/ui`, semua view dan `ScreenFrame` dimigrasi, ADR-0012. Playwright (`apps/web/e2e`, 11 tes lulus, 2 `test.fixme`), job e2e di CI, skrip `pnpm test:e2e`.
- **Review manusia**: Token Signal berasal dari repo referensi, bukan paket resmi, jadi perlu diverifikasi. Font Telkomsel Batik Sans disalin dari repo referensi: konfirmasi izin redistribusi. Playwright lokal memakai Chrome terpasang; job e2e di CI belum pernah dijalankan. Radix `RadioGroup` mengubah role radio; tes diperbarui mengikuti. Dua skenario E2E (stok habis saat submit, slot diambil alih) menunggu fiturnya. Sempat mencoba melempar error Home keluar dari `use cache` agar tidak di-cache, tetapi itu menggagalkan prerender build tanpa backend, jadi dikembalikan: error tetap ditangkap di dalam, dan ISR 15 detik yang menggantinya.

## 2026-10-20 — Triase steering lama (.kiro) dan penyelarasan standar

- **Tool**: Claude Code (Sonnet 5.5)
- **Oleh**: Stradivary
- **Tujuan**: Menilai `.kiro/steering` (proyek MBC lama: Vite, Awilix, SCSS/BEM, GitLab) terhadap arsitektur baru, membuang yang usang, dan membawa yang masih relevan.
- **Output**: Aturan yang dibawa ke `coding-conventions.md` (komponen fungsi, props memperluas atribut HTML, dialog Radix, aksesibilitas, tanpa ternary bersarang, satu import per modul, kebersihan kode, aturan git) dan `testing.md` (selektor, jalur galat, coverage 85% untuk core dan api). Skill `new-ui-component` diselaraskan dengan aturan ARIA countdown. ESLint baru: `no-nested-ternary`, `no-duplicate-imports`, `no-explicit-any`, `ban-ts-comment`, `no-console`, empat aturan `jsx-a11y`. `HomeView` direfaktor untuk satu pelanggaran. `.editorconfig`, `@vitest/coverage-v8`, skrip `pnpm test:coverage` (ambang 85% untuk `core` dan `api`, dipakai CI).
- **Review manusia**: `.kiro/` dibiarkan tidak ter-commit; putuskan hapus atau arsipkan di luar `docs/ai/`. Prettier, Husky, lint-staged, dan commitlint sengaja belum dipasang (Prettier akan memformat ulang seluruh repo); perlu keputusan tim. Logger `api/telemetry` belum ada. Aturan `no-console` belum menjangkau skrip dan test.

## 2026-10-20 — Hook commit (lint-staged dan commitlint)

- **Tool**: Claude Code (Sonnet 5.5)
- **Oleh**: Stradivary
- **Tujuan**: Memastikan kode baru dilint dan pesan commit dicek sejak commit.
- **Output**: Husky (`pre-commit`, `commit-msg`), `lint-staged.config.mjs`, `commitlint.config.mjs`, skrip `prepare`, job `commitlint` di CI untuk PR. `.kiro/` dihapus. Dua commit sebelumnya: `chore` (tooling) dan `style` (Prettier).
- **Review manusia**: Hook diuji dengan file yang melanggar ESLint dan pesan commit yang salah; keduanya ditolak. Job CI commitlint belum pernah dijalankan. `typecheck` sengaja tidak masuk hook (lambat); hanya di CI.


## 2026-10-26 — Dokumentasi routing, lapisan Next.js, dan login/register

- **Tool**: Claude Code (Sonnet 5.5)
- **Oleh**: Stradivary
- **Tujuan**: Mendokumentasikan implementasi routing dan Clean Architecture di Next.js, serta implementasi login dan register.
- **Output**: `docs/architecture/routing-and-layers.md` (peta route, layout dan provider, alur data, penegakan boundaries, `proxy.ts`, cookie sesi) dan `docs/architecture/auth-login-register.md`. Tautan ditambahkan di `overview.md` dan `docs/README.md`.
- **Review manusia**: Login baru placeholder dan register belum ada di kode maupun ADR, jadi dokumen auth memisahkan kondisi nyata, rancangan ADR-0010/0011 (masih Proposed), dan pertanyaan terbuka. Isi dibaca dari kode, belum dijalankan ulang. Perlu dicek tim: celah alur tanpa login, cakupan matcher `proxy.ts`, dan keputusan metode login/register.

## 2026-10-28 — Restrukturisasi: satu aplikasi, Clean Architecture per modul, DI Awilix, SSE

- **Tool**: Claude Code (Opus 5.5)
- **Oleh**: Stradivary
- **Tujuan**: Mengubah repo dari monorepo pnpm menjadi satu aplikasi dengan modul fitur Clean Architecture dan SOLID, memakai Awilix untuk DI, dengan asumsi aplikasi akan berkembang. Di tengah sesi: transport realtime diganti ke SSE.
- **Input**: Seluruh kode `apps/web`, `packages/*`, `mocks`; steering; ADR-0001–0012; dokumentasi `docs/architecture`.
- **Output**:
  - Kode dipindah dengan `git mv` ke `src/` (`app`, `di`, `modules/{catalog,queue,booking,payment,auth,ticket}`, `shared`, `mocks`, `test`). Per modul: `domain`, `application` (use case + port), `infrastructure` (HTTP + zod), `presentation` (+ `views`), `<m>.module.ts`. `pnpm-workspace.yaml` tinggal pengaturan pnpm.
  - Awilix 13 (`PROXY`, `strict`), composition root `src/di`, `useCradle` di presentation, `getServerCradle` untuk Home. `Clock`, `RandomSource`, `AppConfig` diinjeksikan; `process.env` hanya di `src/di/config.ts`.
  - SSE: port `QueueUpdates`/`OrderUpdates`, use case `WatchQueueState`/`WatchOrder`, `EventSourceStreamClient`, hook `useLiveUpdates`, handler `sse` MSW (browser saja), polling sebagai cadangan.
  - `eslint.boundaries.mjs` baru (`default: "disallow"`, aturan per lapisan dan per modul), diuji dengan 6 file probe yang melanggar (semua tertangkap, lalu dihapus).
  - Test baru: use case dengan fake, adapter sistem, composition root, `EventSourceStreamClient`, adapter SSE, ViewModel SSE (queue dan payment), mode `bookingExpiry: "screen"`. 96 test, coverage 97% (domain, application, infrastructure, di).
  - ADR-0013 (satu aplikasi, menggantikan 0001), ADR-0014 (Clean Architecture + SOLID, menggantikan 0002), ADR-0015 (Awilix), ADR-0016 (SSE, mempersempit 0004); catatan implementasi di ADR-0003/0004/0005/0007/0009/0010/0012. Steering, skill (`new-module` baru), overview, routing-and-layers, auth-login-register, README, AGENTS.md diperbarui. Tidak ada isi `docs/ai/` yang dihapus; aturan lama diperbarui path-nya.
- **Review manusia**: `pnpm check` dan `pnpm build` hijau (Home tetap statis, kode mock tidak ada di bundle produksi). **E2E Playwright tidak dijalankan** (dihentikan pengguna), termasuk alur SSE di browser dengan MSW: perlu dijalankan sebelum merge. Kontrak endpoint SSE adalah usulan FE dan perlu disepakati BE. Awilix perlu dicek terhadap tech radar. Kepemilikan per package di ADR-0001 perlu disepakati ulang per modul. Stok Detail Ticket masih polling 15 detik.

## 2026-10-28 — Pencatatan MoM fitur tambahan dan reversal

- **Tool**: Claude Code (Opus 5.5)
- **Oleh**: Stradivary
- **Tujuan**: Mendokumentasikan MoM (fitur tambahan dan reversal keputusan) dan menganalisis dampaknya ke ADR sebelum ADR diubah.
- **Input**: Catatan rapat yang direkam (ditempel pengguna), ADR-0004–0016, `product.md`, `auth-login-register.md`.
- **Output**: `docs/meetings/2026-10-28-mom-fitur-dan-reversal.md` (keputusan rapat apa adanya, tabel dampak ADR/kode, 23 pertanyaan terbuka dengan pemilik), tautan di `docs/README.md`. ADR belum diubah.
- **Review manusia**: Perlu diisi tanggal rapat dan peserta. Perlu dicek bahwa terjemahan keputusan rapat di §1–2 tidak menggeser makna. Konflik utama untuk diputuskan: alur guest (non-login) vs "login wajib" di steering dan ADR-0010/0011 (Q1).

## 2026-10-28 — Memecah `src/shared` menjadi `core`, `platform`, `ui`

- **Tool**: Claude Code (Opus 5.5)
- **Oleh**: Stradivary
- **Tujuan**: Pengguna meminta `shared` diganti `core`. Karena `shared` berisi presentation dan adapter, mengganti nama saja akan menyesatkan; pengguna memilih memecahnya per lapisan.
- **Output**: `src/shared/{domain,application}` → `src/core`, `src/shared/infrastructure` → `src/platform`, `src/shared/presentation` → `src/ui` (`design-system/`, `i18n/`, `hooks/`, `di/`). `sharedModule`/`SharedCradle`/`SharedDependencies` → `coreModule`/`CoreCradle`/`CoreDependencies` (`src/di/core.module.ts`). Element type ESLint boundaries dipetakan ulang (aturan tidak berubah); 5 file probe pelanggaran baru tertangkap semua lalu dihapus. Glob Vitest coverage, ESLint, dan Prettier disesuaikan. ADR-0013/0014/0015 dan catatan ADR-0005/0010/0012/0016, steering, skill, dokumen arsitektur, dan README diperbarui. Entri usage log sebelumnya dibiarkan sebagai riwayat (masih menyebut `src/shared`).
- **Review manusia**: `pnpm check`, coverage (97%), dan `pnpm build` hijau; Home tetap statis, tanpa kode mock di bundle produksi. E2E belum dijalankan.

## 2026-10-29 — Revisi arsitektur: lapisan dan istilah dari `init/clean-arch`

- **Tool**: Claude Code (Opus 5.5)
- **Oleh**: Stradivary
- **Tujuan**: Tim memilih struktur modul per fitur dari branch ini, tetapi ingin istilah yang lebih mudah dibaca serta standardisasi dan pola service dari branch `init/clean-arch` (repo organisasi). ADR-0013–0015 ditulis ulang.
- **Input**: Branch ini (aa02e99), branch `init/clean-arch` (`src/@core/{domain,data,application}`, `src/controllers`, `.kiro/steering/architecture.md`, analisis layering 2026-10-22). Keputusan pengguna: nama lapisan `domain/application/data/controllers/views`, nama file kebab-case berakhiran peran, `src/core` berbentuk modul.
- **Output**:
  - 126 file dipindah (`git mv`), import ditulis ulang. Lapisan modul: `infrastructure` → `data`, `presentation` → `controllers` + `views`; port pindah ke `domain` sebagai `*.protocol.ts`. `src/platform` → `src/core/data`, `src/ui` → `src/core/{controllers,views,i18n}`. Test `__tests__/` dipindah ke sebelah file.
  - Istilah: port → protocol (`OrderProtocol`), adapter/repository → service (`HttpOrderService`), use case berakhiran `UseCase`, ViewModel → controller (`usePaymentController`), cradle → `useDependencies`/`getServerDependencies`/`<M>Registry`. Nama registrasi: `<x>UseCase`, `<x>Service`. Method `OrderProtocol.startPayment` → `initiatePayment`.
  - Diambil dari `init/clean-arch`: konstanta bisnis (`booking.constants.ts`, `payment.constants.ts`, `countdown.constants.ts`), schema per sumber daya di `data/*.schema.ts` dengan `satisfies z.ZodType<Model>`, `isFinalOrder` ke `order.rules.ts`. Tidak diambil: axios/interceptor dan kelas error per kasus (alasan di ADR-0014).
  - `eslint.boundaries.mjs` ditulis ulang untuk lapisan baru (element `container` untuk `*Container.tsx`); 7 file probe pelanggaran tertangkap semua lalu dihapus. Glob coverage Vitest dan ignore ESLint/Prettier disesuaikan.
  - ADR-0013 (struktur, istilah, tabel akhiran file), ADR-0014 (lapisan, service, konstanta, SOLID), ADR-0015 (DI, aturan nama registrasi) ditulis ulang. Catatan implementasi di ADR-0003/0004/0005/0008/0009/0010/0012/0016. Steering `architecture-rules.md` ditulis ulang tanpa membuang aturan; `coding-conventions.md` (tabel penamaan), `testing.md`, `product.md`, skill `new-module`, `new-feature-screen`, `new-ui-component`, `sync-api-contract`, `docs/architecture/*`, README diperbarui.
- **Review manusia**: lint, `tsc`, 96 test, dan `next build` hijau (Home tetap statis, tanpa kode MSW di bundle produksi). **Coverage tidak dijalankan**: `@vitest/coverage-v8` tidak terpasang di `node_modules` lokal, dan `pnpm` lokal gagal dijalankan. Prettier dijalankan dari cache npx (3.9.10) untuk file yang berubah saja. E2E belum dijalankan. `mode: "file"` di boundaries memicu peringatan deprecation plugin v7. Akhiran nama file belum ditegakkan lint.


## 2026-10-27 — Sinkronisasi requirements.md dengan Final Requirements v1.1

- **Tool**: Kiro (Claude Opus 4.5)
- **Oleh**: akbhartomo
- **Tujuan**: Cross-check dan sinkronisasi `.kiro/specs/rusuh-tiket-booking/requirements.md` terhadap ADR-001–005, meeting notes (14, 16, 21, 23, 27 Oktober 2026), dan Final Requirements v1.1 (26 Oktober 2026).
- **Input**: ADR-001–005, meeting notes, Final Requirements v1.1 (`requirements (3).md`), requirements.md yang ada.
- **Output**:
  - **Perubahan kritis**: TTL_Booking anchor diubah ke `granted_at` (bukan saat halaman dibuka); Session_TTL_Antrian dihapus (REJECTED per BR-17); kuota tiket diubah ke 3 per transaksi (bukan per NIK kumulatif); metode pembayaran POC dipersempit ke VA + GoPay saja; BR-07 keterlibatan aktif hanya untuk user login; Dukcapil fail policy diubah ke fail-closed; push notification (Req 3 AC17) dihapus (out of scope POC); refund Disputed diubah ke manual.
  - **Fitur baru**: Home Page dual status (`status` + `queue_state` + `display` block); CAPTCHA tak terlihat (fail-open dengan alarm); pause admission saat circuit breaker OPEN; Pause TTL Grace (+60 detik); sold out reversible (930 detik); Dashboard Disputed list; ganti metode pembayaran.
  - **Business rules diperbarui**: BR-01 (per transaksi), BR-03 (`granted_at`), BR-07 (login only), BR-17 (Session_TTL REJECTED), BR-19 (refund manual), BR-20 (sold out sementara), BR-21 (pause admission), BR-22 (Pause TTL Grace).
  - **Glossary baru**: Keterlibatan_Aktif, Pause_Admission, Pause_TTL_Grace, Sold_Out_Sementara, CAPTCHA_Tak_Terlihat, Display_Block.
  - AC baru dari gap analysis sebelumnya: AC14 (quota check endpoint), AC15 (hold replacement), AC16 (error codes standar) di Req 4; AC7 (e-ticket webhook) di Req 7.
  - Validasi format requirements.md: passed.
- **Review manusia**: Perlu dicek: (1) implikasi perubahan kuota dari per-NIK ke per-transaksi terhadap anti-scalping; (2) keselarasan dengan kontrak API BE untuk dual status Home Page; (3) implementasi invisible CAPTCHA dan provider yang akan dipakai; (4) mekanisme pause admission dan integrasi dengan circuit breaker.

## 2026-11-01 — Penegakan format commit Telkomsel

- **Tool**: Claude Code (Claude Opus 5.5)
- **Oleh**: Ahmad Muzaki
- **Tujuan**: Menyamakan commitlint, hook, dan CI dengan poster Technical Guidelines Commit Message.
- **Input**: Poster commit message, `commitlint.config.mjs`, `.kiro/steering/commit-conventions.md`, `.github/workflows/ci.yml`.
- **Output**: Scope wajib, enam tipe commit sesuai poster, spasi format ditegakkan, subjek boleh memuat akronim; hook dan `webServer` Playwright tidak lagi bergantung pada pnpm; CI memeriksa push ke `develop` dan judul PR; `@types/node` naik ke `^22` agar `npm ci` lolos. Memulihkan perbaikan alias `msw/browser` untuk Windows yang hilang saat sync ke `develop`.
- **Review manusia**: Menunggu review. Commit tanpa tiket Jira kini memakai `[NO-JIRA]`; commitlint, hook Kiro, dan steering disesuaikan, dan auto-increment Jira ID hanya jika diminta eksplisit.

## 2026-11-01 — Template email MJML

- **Tool**: Claude Code (Claude Opus 5.5)
- **Oleh**: Ahmad Muzaki
- **Tujuan**: Menyediakan template email untuk Email_Service di BE: verifikasi registrasi, link login, booking expired, dan e-tiket terbit.
- **Input**: Requirement 1 AC7-8, Requirement 7 AC1-2, MoM 2026-10-28 butir 15, token Signal DS (`signal.css`).
- **Output**: `emails/*.mjml` dengan partial bersama, `npm run emails:build` ke `emails/dist/` (tidak di-commit), test kompilasi dan placeholder di `src/test/__tests__/emails.test.ts`, kontrak placeholder di `emails/README.md`. `package-lock.json` diregenerasi atas permintaan pengguna saat memasang `mjml`.
- **Review manusia**: Menunggu review. Perlu disepakati dengan BE: format placeholder Mustache, penyamaran NIK di e-tiket, dan URL gambar QR. Alur link login belum ada di requirement. Versi Inggris menyusul (Req 13 AC7). Belum diuji di klien email sungguhan.

## 2026-11-01 — Cutover ke `main` dan audit Trunk-Based Development

- **Tool**: Claude Code (Claude Opus 5.5)
- **Oleh**: Ahmad Muzaki
- **Tujuan**: Menyiapkan perpindahan seluruh pekerjaan ke `main` sesuai ADR-0018 dan memulihkan artefak deployment yang hilang saat migrasi.
- **Input**: ADR-0018, `.kiro/steering/git-workflow.md`, `.github/workflows/ci.yml`, serta `Dockerfile`, `/api/health`, dan ADR packaging dari `origin/main`.
- **Output**: `Dockerfile`, `.dockerignore`, `/api/health`, `output: "standalone"`, dan job `image` di CI dipulihkan untuk struktur satu aplikasi (ADR-0021). `develop` dihapus dari CI, pesan lima commit lama ditulis ulang ke format `[NO-JIRA]` tanpa mengubah isi, ADR-0018 berstatus Accepted dan mencatat bagian yang belum tersedia.
- **Review manusia**: Menunggu review PR ke `main`. Proteksi branch perlu diatur admin. Security scan, auto-deploy Dev, feature flag, trigger `release/*`, mergeback otomatis, dan font Poppins self-hosted belum dikerjakan.

## 2026-11-01 — Penyelarasan dokumen dengan kontrak API

- **Tool**: Claude Code (Claude Opus 5.5)
- **Oleh**: Ahmad Muzaki
- **Tujuan**: Menyelaraskan dokumen FE dengan kontrak API dan requirement terbaru di repo `documentations`, dan menyiapkan rancangan login magic link.
- **Input**: `api/api-contracts.md`, `api/rusuh-booking-openapi.yaml`, dan `requirement/update-requirement-rusuh-booking-tiket.md` di repo `documentations`; kode FE; MoM 2026-10-28.
- **Output**: ADR-0023 (Proposed) mengikuti endpoint magic link dari kontrak, dengan usulan perubahan kontrak. Bagian API di `design.md` diganti tautan dan peta ke kontrak. `auth-login-register.md`, `overview.md`, `product.md`, steering, dan skill diselaraskan: login opsional, BR-01, BR-02, factory use case, dan folder `__tests__`. Catatan bertanggal di ADR-0009, ADR-0010, ADR-0011, ADR-0016, dan MoM. Template e-tiket memakai `ticketId` dan `nikMasked`, tanpa nomor kursi. Kode FE belum diintegrasikan ke kontrak.
- **Review manusia**: Menunggu review. Usulan perubahan kontrak di ADR-0023 dan kode error pada response perlu dibahas dengan BE. `.kiro/specs/.../requirements.md` belum diselaraskan dengan update requirement, dan contoh kode lama di `design.md` hanya ditandai lewat catatan di awal dokumen.

## 2026-11-03 — MSW dari OpenAPI dan migrasi data layer ke kontrak

- **Tool**: Claude Code (Claude Opus 5.5)
- **Oleh**: Ahmad Muzaki
- **Tujuan**: Mengganti mock MSW dengan handler yang mengikuti OpenAPI kontrak, lalu memindahkan data layer FE ke bentuk response kontrak.
- **Input**: `Rusuh Tiket Booking App.openapi.json` dari BE (disalin ke `src/core/data/http/openapi.json`), kode `src/mocks`, `src/core/data`, dan `data/` tiap modul.
- **Output**: Handler MSW per tag di `src/mocks/api/` untuk 27 operasi, dengan state per instance dan empat skenario lama, plus test kontrak yang membandingkan response dengan contoh OpenAPI. `createFetchHttpClient` membuka envelope `{ meta, data }`, mengirim header per request, dan memetakan status HTTP ke kode error per endpoint. Credential store baru menyimpan device ID dan grant token untuk header `X-Device-Id` dan `X-Grant-Token`. Schema catalog, queue (join, `/queue/me`, SSE `now_serving` dan `grant`), booking, payment, dan ticket memetakan snake_case ke model domain. Test controller dan service ditulis ulang terhadap mock kontrak; coverage kini memenuhi ambang 85%.
- **Review manusia**: Menunggu review. Alur submit booking belum ada, jadi tombol bayar di Detail Ticket masih menuju booking dummy. Tiket saya butuh sesi akun (Bearer) yang belum dibangun (ADR-0023). Instruksi VA/QR hilang bila halaman pembayaran dimuat ulang karena kontrak tidak mengembalikannya lewat GET. Bank VA default `bca` sampai ada pilihan bank. Test E2E Playwright belum dijalankan.

## 2026-11-03 — Manajemen akun sesuai ADR-0023

- **Tool**: Claude Code (Claude Opus 5.5)
- **Oleh**: Ahmad Muzaki
- **Tujuan**: Membangun login magic link, register, halaman akun dengan Daftar NIK Teman, dan Tiket Saya dengan sesi akun.
- **Input**: ADR-0023, `docs/architecture/auth-login-register.md`, OpenAPI kontrak (`src/core/data/http/openapi.json`), dan modul `auth` yang masih placeholder.
- **Output**: Gateway same-origin (`src/core/data/account/`, route `src/app/api/auth/*` dan `src/app/api/account/*`) menyimpan token akun di cookie httpOnly, meneruskan endpoint akun yang diizinkan ke BE dengan Bearer, dan merefresh sekali saat 401. Modul `auth` berisi domain, use case, service, controller, dan view untuk `/login`, `/login/verify`, `/register`, dan `/account`; `/tickets` kini memakai sesi akun. Primitif baru `Input`, `Checkbox`, dan `Field`. Test gateway dan controller memakai cookie jar di `src/test/support.tsx` supaya alurnya melewati gateway asli.
- **Review manusia**: Menunggu review. ADR-0023 masih Proposed, jadi cara token magic link sampai ke verifikasi, logout di BE, dan endpoint profil masih usulan. Setelah login, `redirect_context` ke halaman pembayaran ditolak `proxy.ts` karena belum ada cookie grant. Mock sisi server (`instrumentation.ts`) berhenti mencegat setelah hot reload di dev, sehingga route akun menjawab 502 sampai server dev dijalankan ulang.

## 2026-11-03 — Desain Waiting Room dan layar auth dengan shadcn

- **Tool**: Claude Code (Claude Opus 5.5)
- **Oleh**: Ahmad Muzaki
- **Tujuan**: Menyamakan Waiting Room dan layar login dengan mockup, dan memakai komponen shadcn untuk auth.
- **Input**: Mockup Waiting Room dan "Authentication — Login" (initial, validasi, link terkirim, sudah masuk, sesi berakhir), `npx shadcn@latest init --preset b1a154v1G --template next`.
- **Output**: shadcn diinisialisasi (`components.json`, Base UI) dan ditambah button, input, label, field, card, alert, badge, separator, spinner, dan checkbox. Token, font, dan base layer yang ditimpa preset dikembalikan ke `signal.css`; ukuran komponen disesuaikan ke Signal (kontrol 40px, teks 14px, tombol nonaktif abu-abu). Layar login, verifikasi, dan register memakai `SiteShell` dan `AuthCard`; verifikasi menampilkan "Kamu sudah masuk" dengan kartu booking yang dipulihkan, dan `/login?session=expired` menampilkan varian sesi berakhir. Waiting Room kini punya breadcrumb, judul, kartu status, kartu event dari `GET /events/{event_id}`, dan tips. Primitif `Input`, `Checkbox`, dan `Field` buatan sendiri dihapus.
- **Review manusia**: Menunggu review. Teks mockup diterjemahkan ke bahasa Indonesia. Tips "Maksimal 3 tiket per NIK" diganti aturan BR-01/BR-02. Kartu konteks booking di layar sesi berakhir belum ada karena FE belum menyimpan niat booking. Mock MSW di browser dan server berhenti mencegat setelah hot reload di dev; muat ulang halaman atau jalankan ulang server.

## 2026-11-04 — Desain Detail Tiket, Pembayaran, dan konfirmasi register

- **Tool**: Claude Code (Claude Opus 5.5)
- **Oleh**: Ahmad Muzaki
- **Tujuan**: Menyamakan halaman Detail Tiket, Pembayaran, dan alur konfirmasi register dengan mockup, responsif dari 375px sampai desktop, dengan gambar konser placeholder baru.
- **Input**: Mockup "Detail tiket", "Pembayaran", dan "Authentication — Confirmation & Success", foto konser placeholder, OpenAPI kontrak (`src/core/data/http/openapi.json`).
- **Output**: `PageHeader` (breadcrumb dan langkah checkout) dan `CheckoutCards` (countdown, kartu event, ringkasan pesanan) dipakai bersama Waiting Room, Detail Tiket, dan Pembayaran. Kelas tipografi `type-*` kini `@utility` Tailwind sehingga bisa diberi varian responsif. Detail Tiket mengisi identitas pemesan, satu NIK per tiket dengan cek Dukcapil (`POST /nik/validate`) saat field ditinggalkan, lalu membuat booking lewat `POST /bookings` dan pindah ke `/orders/{id}/pay`. Pembayaran memakai metode dari `GET /payments/{id}/methods`, pilihan bank VA, kartu event, dan kontrol mock lewat `POST /payments/webhook`; status akhir tampil di halaman yang sama dan `PaymentResultView` dihapus. Register membuka dialog konfirmasi (drawer di mobile, shadcn `dialog`) sebelum mengirim, lalu dialog sukses ke `/register/verify-email` dengan kirim ulang link; `/register/verified` ditambahkan. Gambar `public/images/concert-placeholder.webp` menggantikan gambar event di fixture dan fallback.
- **Review manusia**: Menunggu review. Kontrak belum punya nama pemesan dan nomor bangku, jadi nama hanya dikumpulkan dan bangku tampil "Ditentukan otomatis". Opsi "Transfer Bank" manual di mockup tidak ada di kontrak. Kirim ulang verifikasi memakai endpoint resend magic link sebagai pengganti, dan `/register/verified` statis karena belum ada endpoint verifikasi pendaftaran. Instruksi pembayaran masih hilang setelah muat ulang.

## 2026-11-04 — Detail tiket, profil, alias pemegang tiket, dan ADR shadcn/Base UI

- **Tool**: Claude Code (Claude Opus 5.5)
- **Oleh**: Ahmad Muzaki
- **Tujuan**: Menambah halaman detail tiket yang sudah dibeli, halaman profil, kelola alias (nama + NIK) dengan tambah, ubah, dan hapus, memilih alias sebagai pemegang tiket di Detail Ticket, dan mencatat keputusan shadcn/ui di atas Base UI.
- **Input**: Steering `docs/ai/steering/*`, skill `new-module` dan `write-adr`, ADR-0013–0015, ADR-0012, ADR-0017, ADR-0023, OpenAPI kontrak (`src/core/data/http/openapi.json`), `components.json`, `package.json`, modul `auth`, `booking`, dan `ticket` di `origin/main`.
- **Output**: `/tickets/[ticketId]` merender `ETicketView` (sebelumnya `TicketCard` menautkan ke route yang belum ada) lewat `useTicketDetailController`; pemilik memakai sesi akun lewat `/api/account/tickets/{id}/eticket`, tautan email memakai `?t=`, dan teks view pindah ke i18n. `/account` menjadi Profil saya: data akun dari `GET /accounts/me` dengan fallback ke sesi, alias dengan form ubah dan dialog konfirmasi hapus, validasi nama dan NIK 16 digit di `account.rules.ts` yang juga dipakai use case. Booking punya `HolderAliasProtocol` sendiri (modul tidak saling impor); memilih alias mengisi NIK slot, alias yang sudah dipakai tiket lain dinonaktifkan, dan `validateBookingTickets` (maks. 3 tiket, 1 NIK per tiket, tanpa NIK dobel) dijalankan `SubmitBookingUseCase` sebelum request. `HttpClient.patch` dan daftar izin gateway untuk PATCH alias, profil, dan e-tiket ditambahkan. ADR-0024 mencatat shadcn `base-mira` di atas Base UI. Asumsi endpoint dicatat di `docs/api/contract-assumptions.md`. Setelah review visual, `/account` dan `/tickets/[ticketId]` dipindah dari kartu sempit `ScreenFrame` ke `SiteShell` + `PageHeader` dengan layout dua kolom seperti Waiting Room dan Detail Ticket.
- **Review manusia**: Menunggu review. `GET /accounts/me`, `PATCH /accounts/me/saved-niks/{id}`, dan field `nik` lengkap di daftar alias belum ada di kontrak; tanpa field `nik`, pilihan alias di Detail Ticket tidak muncul dan NIK diisi manual. Halaman dicek manual di browser (desktop 1280px dan mobile 375px) terhadap mock; E2E Playwright belum dijalankan. Komponen shadcn mengimpor `cn` dari paket `cn` sementara alias `utils` menunjuk `cn.utils`; belum disatukan.

## 2026-11-04 — Navbar dengan status masuk, line ending LF, dan modal galat

- **Tool**: Claude Code (Claude Opus 5.5)
- **Oleh**: Ahmad Muzaki
- **Tujuan**: Navbar menampilkan akun yang sedang masuk di semua halaman, line ending repo dipaksa LF, dan modal galat sesuai desain "G / Timeout", "G / Mismatch", dan "I / Already used".
- **Input**: Desain modal "NIK Verification Unavailable", "Check Your NIK", dan "Login Link Failed" beserta catatan trigger/preserve/retry, `Navbar`, `site-chrome.utils.ts`, `.editorconfig`, `.prettierrc.json`.
- **Output**: Sesi akun pindah ke `core` (`SessionAccountProtocol`, `GetSessionAccountUseCase`, `useSiteChrome()`), memakai kunci cache yang sama dengan akun di modul `auth`, sehingga masuk dan keluar langsung terlihat di navbar; semua controller dan Container yang merender navbar memakai hook ini. `.gitattributes` (`* text=auto eol=lf`) mengalahkan `core.autocrlf=true` di Windows, dan `npm run format:check` kini lolos untuk seluruh repo. Modal: `ActionDialog` di design system, `useModal()` untuk state modal per layar, dan `nik-dialog.mapper.ts` untuk dialog NIK. Detail Ticket dan form alias membuka "Periksa NIK-mu" saat Dukcapil menolak dan "Verifikasi NIK belum tersedia" saat tidak menjawab (isian tetap, coba lagi hanya lewat tombol, "Ubah data" memfokus field NIK). Verifikasi login membuka "Link login gagal" bila link sudah dipakai atau kedaluwarsa, dan langsung melanjutkan bila perangkat sudah punya sesi.
- **Review manusia**: Menunggu review. Modal "belum tersedia" dicek lewat test (MSW `HttpResponse.error()`), tidak di browser, karena mock tidak punya skenario timeout Dukcapil. Checkout lama di Windows perlu dikonversi sekali ke LF setelah `.gitattributes` masuk: dengan working tree bersih, `git rm -rq --cached . && git reset --hard HEAD`. Di mode mock, query ditahan sampai worker MSW siap, sehingga navbar dan isi halaman bisa terlambat beberapa detik setelah navigasi di dev.

## 2026-11-04 — Katalog ActionDialog dan sheet mobile

- **Tool**: Claude Code (Claude Opus 5.5)
- **Oleh**: Ahmad Muzaki
- **Tujuan**: Mendokumentasikan ActionDialog, menambah dialog dari desain (layanan tidak tersedia, sesi berakhir, verifikasi email gagal, akun sudah terdaftar, pendaftaran gagal, terjadi kesalahan, koneksi bermasalah, konfirmasi data), dan menampilkan dialog sebagai sheet di mobile.
- **Input**: Desain dialog "Service Temporarily Unavailable", "Session Expired", "NIK Verification Unavailable", "Email Verification Failed", "Email Already Registered", "Registration Failed", "Something Went Wrong", "Connection Problem", "Confirm Your Information" (desktop dan mobile 390px), dokumentasi Base UI Drawer di `node_modules/@base-ui/react/docs`.
- **Output**: `ActionDialog` memakai Base UI Drawer sebagai bottom sheet (geser ke bawah untuk menutup) di bawah 640px dan modal di tengah di atasnya; nada `warning`, `icon`, `details`, `note`, dan `error` ditambahkan. Builder dialog umum di `core/controllers/common-dialogs.mapper.ts` dan dialog auth di `modules/auth/controllers/auth-dialogs.mapper.ts`. Login memakai "Koneksi bermasalah" dan "Layanan sedang tidak tersedia"; register memakai konfirmasi data, berhasil, "Akun sudah terdaftar", "Periksa NIK-mu", "Pendaftaran gagal", dan "Koneksi bermasalah" (dialog register buatan sendiri dihapus); profil memakai "Sesi berakhir" dan dialog galat hapus alias; Detail Ticket memakai dialog galat saat submit tanpa respons. Dokumentasi di `docs/architecture/action-dialog.md`, galeri di `/signal-demo/dialogs`.
- **Review manusia**: Menunggu review. Teks desain diterjemahkan ke bahasa Indonesia. "Akun sudah terdaftar" menyebut email atau NIK karena kontrak hanya punya 409 untuk NIK. "Verifikasi email gagal" belum dipasang ke alur mana pun karena kontrak belum punya endpoint verifikasi pendaftaran; sementara hanya tampil di galeri.

## 2026-11-04 — Layar status tanpa kartu merah

- **Tool**: Claude Code (Claude Opus 5.5)
- **Oleh**: Ahmad Muzaki
- **Tujuan**: Mengganti kartu berkepala merah ("Memuat…", "Menyiapkan sesi bookingmu…", galat) dengan layar status yang sejalan dengan situs dan ActionDialog.
- **Input**: `StatusView`, `ScreenLoading`, `ScreenPlaceholder`, controller booking, payment, dan ticket.
- **Output**: `StatusView` kini kartu di tengah dengan spinner atau ikon dalam lingkaran, judul, penjelasan, dan tombol pil, di dalam `SiteShell` (controller menyertakan navbar) atau header merek saja untuk fallback Suspense. Nada `warning` ditambahkan dan dipakai saat waktu booking habis. `ScreenPlaceholder` dihapus; `BrandLink` diekstrak dari `Navbar`.
- **Review manusia**: Menunggu review. Status memuat di halaman dengan data cepat (mock) jarang terlihat; status galat dicek di browser pada 1280px dan 375px.

## 2026-11-04 — Placeholder Pusat Bantuan

- **Tool**: Claude Code (Claude Opus 5.5)
- **Oleh**: Ahmad Muzaki
- **Tujuan**: Menu "Bantuan" di navbar berujung 404; tambahkan halaman sementara.
- **Input**: `docs/ai/steering/product.md` (BR-01, BR-02, login opsional, countdown pembayaran, e-tiket via email).
- **Output**: Route `/help` (`src/app/help`) dengan `HelpView` di `src/core/views`: header halaman, catatan bahwa pusat bantuan masih disiapkan, lima pertanyaan umum dari aturan produk yang sudah pasti, dan pintasan ke Tiket saya dan Jelajahi event. Navbar menandai "Bantuan" aktif.
- **Review manusia**: Menunggu review. Kanal kontak sengaja tidak diisi sampai ada dari tim.

## 2026-11-07 — Catatan Rusuh: i18n, aset Signal, skeleton, alias, validasi register

- **Tool**: Claude Code (Claude Opus 5.5)
- **Oleh**: Ahmad Muzaki
- **Tujuan**: Menarik `main`, lalu mengerjakan catatan tim: i18n (fokus Detail Ticket, profil, booking), aset Signal di komponen, tombol daftar abu-abu bila format email salah, modal, mengeluarkan view dari `src/core`, nama lengkap di form alias, skeleton untuk semua status memuat, dan rencana deploy Cloudflare lewat CI/CD.
- **Input**: Catatan tim, `main` (merge `origin/main`, konflik diselesaikan ke sisi `main` karena isi branch sudah ada di sana), ikon Telkomsel di `../commons/src/assets/icons`, file Figma SJT-ZAKI (hanya akses lihat, tidak bisa diekspor tanpa token), README vinext.
- **Output**: i18n: `en.messages.ts`, `locale.utils.ts` (bahasa aktif, fallback ke `id`), `useLocale()` dengan `LocalePreferenceProtocol` dan service localStorage di DI, tombol ID/EN di navbar, tanggal di layar fokus ikut bahasa. Aset Signal: `src/components/ui/icons` (20 ikon Signal sebagai komponen `currentColor`, sisanya lucide sampai ada padanan) dipakai semua komponen, termasuk pengganti SVG inline. Register: tombol nonaktif selama email, NIK, atau persetujuan belum valid; galat email muncul setelah field ditinggalkan. Modal: konfirmasi hapus alias pindah ke `ActionDialog`; bayar gagal tanpa respons membuka dialog coba lagi. `src/core/views` dihapus: `ScreenLoading` ke design system (`PageSkeleton.tsx`, props-only), Pusat Bantuan jadi modul `help`. Alias punya nama lengkap (asumsi kontrak di `docs/api/contract-assumptions.md`, mock MSW). Skeleton: `Skeleton`, `PageSkeleton` (varian page, list, checkout, ticket, profile, queue) untuk fallback Suspense, status memuat Booking, Payment, e-tiket, profil, daftar event dan tiket, serta Waiting Room. Rencana deploy di `docs/deploy/cloudflare-cicd-plan.md`.
- **Review manusia**: Menunggu review. Ikon diambil dari `../commons`, bukan ekspor Figma langsung; perlu dicocokkan dengan file Figma. Label tombol tutup tersembunyi di dialog (`Tutup`) masih bahasa Indonesia di design system. Payment belum diterjemahkan (di luar fokus). Dialog bayar gagal dicek lewat typecheck dan review, belum ada test controller payment (test yang ada masih kosong). Pane browser bawaan tidak bisa mendaftarkan service worker MSW, jadi alur masuk dicek di Chrome.


## 2026-11-08 — i18n integration: terjemahan Inggris untuk semua layar

- **Tool**: Claude Code (Claude Sonnet 5.5)
- **Oleh**: Ahmad Muzaki
- **Tujuan**: Cabang `feature/i18n-integration` dari `feature/booking-payment-redesign` (setelah merge `origin/main`); memperluas i18n dari layar fokus ke semua halaman.
- **Input**: `src/core/i18n/id.messages.ts` (476 key) dan `en.messages.ts` (182 key sebelumnya).
- **Output**: 294 key Inggris ditambahkan (katalog, antrean, login/register/verifikasi, bantuan, dialog, pembayaran). Test `en.messages.test.ts` kini mewajibkan semua key terjemah; test fallback `t.utils.test.ts` menghapus key sementara. Komentar `en.messages.ts` dan `locale.utils.ts` diperbarui.
- **Review manusia**: Menunggu review bahasa Inggris (nada dan istilah). Label tutup dialog di design system dan teks merek "BOOKING TIKET" di navbar belum diubah. Belum dicek visual di browser.

## 2026-11-08 — Konsolidasi aturan AI ke `.kiro/`

- **Tool**: Claude Code
- **Oleh**: Ahmad Muzaki
- **Tujuan**: `docs/` hanya berisi ADR dan dokumentasi developer; semua aturan AI pindah ke `.kiro/`.
- **Input**: `.kiro/` dan `docs/ai/` lama.
- **Output**: `docs/ai/steering/*` → `.kiro/steering/` (ditambah front matter `inclusion`), `docs/ai/skills/` → `.kiro/skills/`, file ini → `.kiro/usage-log.md`. `architecture-layers.md` dan `naming-conventions.md` dihapus karena isinya sudah tercakup `architecture-rules.md` dan `coding-conventions.md`. Rujukan di `AGENTS.md`, `README.md`, `docs/README.md`, ADR-0023/0024, MoM, `eslint.config.mjs`, dan `commitlint.config.mjs` diperbarui. Entri lama di log ini tidak diubah, jadi path `docs/ai/` di dalamnya adalah path historis.
- **Review manusia**: Perlu dicek bahwa `design-system.md` dan `coding-patterns.md` masih menyebut Radix; ADR-0024 memakai Base UI.

## 2026-11-08 — Perbaikan kualitas SonarCloud

- **Tool**: Claude Code (Claude Sonnet 5.5)
- **Oleh**: zaki
- **Tujuan**: Menutup temuan SonarCloud: regex backtracking, promise tanpa penanganan, duplikasi katalog i18n, dan cakupan 30%.
- **Input**: Daftar isu dan cakupan dari SonarCloud, `vitest.config.ts`, `sonar-project.properties`.
- **Output**: `isEmail` di `account.rules.ts`, `ticket-slots.rules.ts`, dan mock auth ditulis tanpa regex berantai. `AppProviders` menangani kegagalan worker mock; mutasi simulasi di `payment.controller.ts` mengembalikan promise invalidasi. Laporan cakupan kini mencakup semua kode logika (`include: src/**`) dengan pengecualian presentasional; `sonar.coverage.exclusions` dan `sonar.cpd.exclusions` ditambahkan. Test baru: controller pembayaran (sebelumnya dinonaktifkan), status registrasi, Home loader/controller, Bantuan, route API, proxy, order rules, use case dan simulator pembayaran, `AppProviders`. Perbaikan perilaku: daftar metode pembayaran kini juga dimuat untuk order FAILED supaya customer bisa memilih ulang setelah muat ulang halaman (BR-06).
- **Review manusia**: Perlu dicek bahwa pengecualian cakupan sesuai kebijakan tim, dan bahwa angka cakupan di SonarCloud sesudah merge mendekati angka lokal (96% baris).


## 2026-11-09 — Sinkronisasi OpenAPI terbaru dan alias tanpa nama lengkap

- **Tool**: Claude Code (Claude Sonnet 5.5)
- **Oleh**: zaki
- **Tujuan**: Mengikuti `Default module.openapi.json` terbaru (28 endpoint) dan menyederhanakan alias menjadi nama alias + NIK dengan notice UU PDP.
- **Input**: OpenAPI terbaru dari tim BE, `src/core/data/http/openapi.json` lama, tes kontrak MSW.
- **Output**: `openapi.json` diganti. Mock MSW: `meta.server_time` dan `meta.error_code`, `captcha` di detail event, `captcha_token` wajib di join (400 `CAPTCHA_REQUIRED`, 403 `CAPTCHA_FAILED`), join tanpa `estimated_wait_minutes` (dengan `queue_token`, `rejoined`), `poll_tiers` dan `state` di `/queue/serving`, `GET /auth/verify-email`, webhook format Midtrans (tanda tangan di body), `eticket_url` membawa `?t=`, `/bookings/{id}/tickets` dihapus, NIK saved tidak ditemukan 422. FE: `CaptchaProtocol` (Turnstile tak terlihat, mode mock tanpa skrip), ETA antrian dari `rate_per_min`, halaman `/register/verified` memanggil `verify-email` (token di query atau fragmen), kode galat `CAPTCHA_FAILED`, `SALE_NOT_OPEN`, `EMAIL_LINK_INVALID`. Alias: field nama lengkap dihapus di semua lapisan; form alias memuat notice UU PDP.
- **Review manusia**: Teks notice UU PDP perlu dicek tim hukum. Turnstile asli belum diuji terhadap BE (hanya mode mock dan fake widget di test); pastikan origin produksi diizinkan di dashboard Turnstile. Format tautan di email verifikasi (`?token=` atau `#token=`) perlu dikonfirmasi ke BE. PATCH alias tetap asumsi FE (tidak ada di spec). `POST /verify` (mock Dukcapil) tidak dipakai FE.

## 2026-11-09 — Tindak lanjut checklist: T&C, pre-push, e2e, template email

- **Tool**: Claude Code (Claude Sonnet 5.5)
- **Oleh**: zaki
- **Tujuan**: Menutup butir checklist yang tersisa setelah PR sinkronisasi OpenAPI.
- **Input**: Checklist tim, `.husky/`, `emails/`, `e2e/`, `src/app/(public)/signal-demo`, `docs/deploy/`.
- **Output**: Modul `legal` (halaman `/terms` dan `/privacy`, teks draf ID dan EN), tautan keduanya di persetujuan register dan footer. Hook `pre-push` (typecheck dan test). Template email: logo dari `{{logoUrl}}` dan `{{appUrl}}` di header, teks verifikasi disesuaikan dengan kontrak (link 15 menit, sekali pakai; akun belum terverifikasi tetap bisa membeli). E2E baru: register, login, verifikasi email, dokumen hukum, CAPTCHA antrian. Dihapus: halaman `signal-demo`, primitive `Alert` dan `RadioGroup` yang tidak dipakai produk. Rencana deploy Cloudflare diganti `docs/deploy/vercel-cloudflare-dns.md`.
- **Review manusia**: Teks Syarat dan Ketentuan serta Kebijakan Privasi adalah draf dan perlu ditinjau tim hukum (halaman menampilkan pemberitahuan draf). Berkas logo PNG belum ada di repo; BE perlu mengisi `logoUrl`. Isi doc deploy mengandalkan integrasi Git Vercel standar; cocokkan dengan pengaturan proyek yang sebenarnya. Primitive `Badge`, `Button`, `Card`, `Progress` masih dipakai view dan belum dimigrasi ke komponen shadcn.

## 2026-11-09 — Selaraskan FE dan mock dengan kontrak, migrasi komponen, hapus nama di register

- **Tool**: Claude Code (Claude Sonnet 5.5)
- **Oleh**: zaki
- **Tujuan**: Mengganti mock MSW dengan backend asli cukup dengan mengubah `NEXT_PUBLIC_API_BASE_URL`; satu set komponen UI; form register tanpa nama.
- **Input**: `openapi.json` v2.7, daftar endpoint yang dipanggil FE, `src/components/ui/primitives/*`.
- **Output**: Test `api-conformance.test.ts` memvalidasi setiap request FE (path, method, header, query, body) dan response mock terhadap skema kontrak dengan ajv, serta memastikan semua operasi yang dipakai FE tersentuh. FE tidak lagi memanggil endpoint di luar kontrak: profil (`GET /accounts/me`) dan ubah alias (`PATCH`) dihapus beserta gateway, mock, use case, dan UI. Mock `saved-niks` tidak lagi mengirim `nik` lengkap (test pemilihan alias menambahkannya sebagai asumsi). Register tanpa field nama. `primitives/` (Badge, Button, Card, Progress) dimigrasi ke komponen shadcn di Base UI: `Badge` mendapat varian Signal (success, info, warning, error), `Progress` baru di `ui/progress.tsx`, dependensi `radix-ui` dihapus. `ajv` dan `ajv-formats` ditambah sebagai devDependency.
- **Review manusia**: Halaman akun kehilangan baris nama dan tanggal bergabung (tidak ada di kontrak). Alias tidak bisa diubah, hanya dihapus lalu ditambah ulang. Pilihan alias di Detail Ticket tidak akan muncul sampai BE menyertakan `nik` lengkap (asumsi utama yang tersisa, lihat `docs/api/contract-assumptions.md`). Tampilan badge dan tombol bergeser sedikit mengikuti ukuran shadcn; sudah dilihat di Home, kartu event, dan Waiting Room, belum di My Tickets dan e-tiket.

## 2026-11-10 — Batas NIK, form pemesan tanpa nama, tanpa nomor bangku, modal sesuai spreadsheet aset

- **Tool**: Claude Code (Claude Sonnet 5.5)
- **Oleh**: zaki
- **Tujuan**: Isian NIK dibatasi 16 digit; Detail Ticket tanpa nama pemesan dan tanpa nomor bangku; ilustrasi dan teks modal mengikuti spreadsheet "Icon & Asset reference for SJT".
- **Input**: Spreadsheet referensi aset (Sheet1), tiga lembar sprite Signal DS (`illustration-lg-row2/3/5`, diunduh dengan persetujuan).
- **Output**: `sanitizeNikInput` (hanya digit, digit ke-17 dst ditolak) dan `maxLength` di input NIK booking, register, dan alias. Nama pemesan dihapus dari form booking (kontrak hanya butuh email). Nomor bangku dihapus dari form pemegang tiket, kartu tiket, dan e-tiket. Lima ilustrasi dipotong dari lembar sprite menjadi WebP di `public/images/illustrations/`; \`ActionDialog\` mendapat prop \`illustration\`. Modal baru: tanpa jaringan global (\`AppProviders\`), konfirmasi keluar antrian (tombol "Keluar dari antrian" di Waiting Room), info setelah login. Teks modal register, koneksi, dan galat umum mengikuti spreadsheet.
- **Review manusia**: Teks Inggris saya perbaiki tata bahasanya dari spreadsheet ("You are disconnect" menjadi "You are disconnected", "Your have successfully Register" menjadi "You have successfully registered"); teks Indonesia verbatim. Kontrak belum punya endpoint keluar antrian, jadi "nomor antrian baru" bergantung pada BE saat join ulang. Baris "Confirmation for Booking" di spreadsheet masih kosong, modalnya belum dibuat. Pemetaan ilustrasi per modal (mis. envelope untuk info login) adalah pilihan saya dari lembar sprite; ganti bila desain menunjuk gambar lain.

## 2026-11-10 — E2E lintas viewport dan perbaikan target sentuh

- **Tool**: Claude Code (Claude Sonnet 5.5)
- **Oleh**: zaki
- **Tujuan**: Meningkatkan cakupan E2E dengan pemeriksaan responsif di berbagai ukuran layar.
- **Input**: `playwright.config.ts`, `e2e/*.spec.ts`, komponen layout (`Navbar`, `Footer`, `PageHeader`, `LegalView`).
- **Output**: Empat proyek Playwright baru (`small-mobile` 360px, `tablet` 768px, `desktop` 1280px, `wide-desktop` 1920px) yang menjalankan happy path dan `responsive.spec.ts` (tanpa scroll horizontal, tanpa elemen keluar viewport, target sentuh minimal 24px, dialog muat di layar dan bisa ditutup dengan Escape, tanpa error console). Hasil pertama menemukan tautan footer, navbar, breadcrumb, dan tautan silang halaman legal setinggi 20px; semuanya diberi `min-h-6`. Footer ditumpuk vertikal di layar sempit.
- **Review manusia**: Error console 401 dari cek sesi anonim dan `ERR_NAME_NOT_RESOLVED` pada stream SSE mock (kadang tidak dicegat MSW saat jam palsu aktif; controller jatuh ke polling) dikecualikan di tes. Kotak centang dan radio dikecualikan dari cek ukuran karena area sentuhnya diperluas lewat `::after`. Tampilan visual belum dilihat manual di tiap breakpoint.

## 2026-11-10 — Standarisasi primitif UI ke Base UI

- **Tool**: Claude Code (Claude Sonnet 5.5)
- **Oleh**: zaki
- **Tujuan**: Semua kontrol interaktif memakai Base UI (shadcn style base-mira), bukan elemen buatan sendiri.
- **Output**: Komponen baru `radio-group.tsx`, `toggle-group.tsx`, `select.tsx` di `src/components/ui`. Dimigrasi: pilihan metode pembayaran (`role="radio"` manual menjadi `RadioGroup`), pilihan bank dan sakelar bahasa Navbar (tombol `aria-pressed` manual menjadi `ToggleGroup`), pilihan sumber pemegang tiket (`<select>` native menjadi `Select`). ESLint kini melarang impor `radix-ui`/`@radix-ui/*` dan `<select>` native. `jsx-a11y/label-has-associated-control` dikenalkan pada `RadioGroupItem` dan `Checkbox`.
- **Review manusia**: `Select` Base UI (popup di portal) belum dilihat di browser karena hanya muncul bila ada NIK tersimpan; belum ada tes untuknya. Tampilan kartu metode pembayaran belum dibandingkan secara visual dengan sebelumnya.

## 2026-11-10 — Sesi setelah login, Tiket Saya, dan navigasi mobile

- **Tool**: Claude Code (Claude Sonnet 5.5)
- **Oleh**: zaki
- **Tujuan**: Memperbaiki keadaan setelah login: navbar, halaman Tiket Saya, dan akses navigasi di layar kecil.
- **Input**: Alur `/login/verify` sampai `/tickets` di dev server (mock MSW), spesifikasi `GET /users/me/tickets`.
- **Output**: (1) Navbar di bawah 768px tidak punya navigasi sama sekali; `NavbarMenu` (tombol hamburger + panel bawah) menampilkan Jelajahi event, Tiket saya, Bantuan, dan tombol Masuk menjadi ikon di layar sempit agar muat di 320px. (2) Kartu Tiket Saya menampilkan baris "Nama" dan "NIK" kosong karena list di kontrak tidak mengirimnya; kini baris tanpa nilai disembunyikan dan harga serta nomor tiket tampil. (3) Tamu di Tiket Saya melihat kerangka tanpa akhir karena 401 dicoba ulang; kini langsung muncul ajakan masuk. (4) `session.cache.ts`: masuk menyegarkan semua data, keluar membuang data milik akun; kueri sesi ikut menyegarkan saat tab difokuskan. (5) `e2e/session.spec.ts` dan tes navigasi di `responsive.spec.ts`.
- **Review manusia**: Tombol masuk di layar sempit hanya ikon (nama tetap ada lewat `aria-label`). Kontrak list tiket belum mengirim nama pemegang dan NIK; baris itu kembali tampil otomatis bila BE menambahkannya. Dengan BE asli, 401 dari `/api/account/tickets` bergantung pada cookie yang disetel route same-origin; belum diuji.

## 2026-11-10 — Kontrak v2.12: event stream antrian, pilihan NIK profil di booking, pengelompokan tiket

- **Tool**: Claude Code (Claude Sonnet 5.5)
- **Oleh**: zaki
- **Tujuan**: Menyelaraskan FE dengan kontrak terbaru dari repo `documentations` (v2.12.0) tanpa menunggu backend, dan merapikan Detail Ticket.
- **Input**: `api/api-contracts.md` v2.12.0 (repo privat, dibuka lewat Chrome yang sudah login, diunduh dengan persetujuan; disalin ke `docs/api/api-contracts.md`). `rusuh-booking-apidog.json` belum terunduh, jadi `openapi.json` lokal belum disinkronkan penuh.
- **Output**: (1) Stream antrian v2.12: pesan default `{nowServing, state, ratePerMin, serverTime}`, event `status` (FULL_BOOKED reversibel: estimasi disembunyikan, stream tetap terbuka), `stale` (posisi diredupkan, "Memperbarui…", tanpa menutup atau menyambung ulang), `sold-out` (menutup stream), `reconnect` (polling sementara). Event `grant` dihapus: saat `nowServing >= ticket_no` klien memanggil `/queue/me` dan mengulang tiap 1 detik bila masih `QUEUED` posisi 0. Join 410 menjadi `SALE_CLOSED`. Mock MSW mengikuti bentuk ini. (2) Alias (nama + NIK) tetap ada karena `POST /accounts/me/saved-niks` di Apidog masih mewajibkan `label`; sempat dihapus lalu dikembalikan. Mock mengirim `nik` lengkap ke pemilik akun (asumsi FE) sehingga NIK profil bisa dipilih di Detail Ticket. (3) Detail Ticket mengelompokkan tiket per kategori ("Normal × 2" sekali, bukan "Normal × 1" berulang). (4) Tes baru: service SSE, controller antrian (FULL_BOOKED, stale, sold-out), `ticket.queries`, hook kedaluwarsa, Turnstile, controller booking dan tiket; e2e `saved-nik.spec.ts` dan pengelompokan di `booking.spec.ts`.
- **Review manusia**: Kontrak v2.12 tidak mengirim `nik` lengkap di daftar alias, jadi pilihan alias di Detail Ticket baru berfungsi bila BE menyetujui asumsi FE (lihat `docs/api/contract-assumptions.md`). Event `status`/`stale` belum bisa dipicu di e2e (mock tidak mengubah state sale di tengah stream); dicakup tes controller dan service. Kebijakan 401 `DEVICE_MISMATCH` pada token antrian belum ditangani.

## 2026-11-11 — Kategori Home, layar sukses 5 detik, modal antrian penuh dan waktu booking habis

- **Tool**: Claude Code (Claude Sonnet 5.5)
- **Oleh**: zaki
- **Tujuan**: Menyelesaikan daftar perbaikan Home, auth, Tiket Saya, dan modal; menyiapkan FE untuk BE asli di AWS.
- **Input**: Kontrak v2.12 §2.1 (aturan `display`), pemeriksaan GET/POST kosong ke gateway uji AWS, kode `catalog`, `auth`, `queue`, `booking`.
- **Output**: (1) Home: `category` dan `sale_starts_at` dibaca dari BE; filter kategori (`EventGrid`, tampil bila ada lebih dari satu kategori); tombol dan chip mengikuti `label_key` (Masuk Antrian, Beli Tiket, Buka 10 Nov 09:00, Antrian Penuh, Stok Habis Sementara, Habis Terjual) dengan chip bernada sesuai. (2) `useAutoRedirect`: email terverifikasi menuju `/login` dan berhasil masuk menuju tujuannya, keduanya setelah 5 detik dengan teks hitung mundur. (3) Menu Tiket saya disembunyikan untuk tamu; keadaan kosong Tiket Saya punya tombol Jelajahi event. (4) Join antrian ditolak `QUEUE_FULL` atau `FULL_BOOKED` membuka modal (coba lagi, kembali ke beranda); `FULL_BOOKED` kini tidak salah terbaca `SALE_NOT_OPEN`. (5) Waktu booking habis (server menjawab ACCESS_EXPIRED) saat formulir sudah tampil: modal di atas formulir menggantikan layar status. (6) Memasukkan fix verify-email lewat BFF (cookie `magic_token`) dari `fix/verify-email-bff`.
- **Review manusia**: Field nama di Register sudah tidak ada di `main`, jadi tidak ada yang dihapus. Gateway uji AWS hanya melayani auth, akun, users, nik, dan bookings; `/events` dan `/queue/*` masih 404, jadi Home dan antrian belum bisa dicoba dengan BE asli dan login hanya bisa diuji end-to-end lewat email sungguhan. Modal waktu habis mengabaikan `NEXT_PUBLIC_BOOKING_EXPIRY` bila formulir sudah tampil. Tampilan belum diperiksa visual selain teks halaman Home (mock); layar verified dan login sukses hanya dicek lewat test. "UI Detail Ticket" belum dikerjakan karena belum ada desainnya.

## 2026-11-11 — QR e-tiket dan format commit berbasis issue

- **Tool**: Claude Code (Claude Sonnet 5.5)
- **Oleh**: zaki
- **Tujuan**: QR e-tiket kosong dan tidak jelas asalnya; header commit memakai nomor issue GitHub.
- **Output**: Gambar `qr_code` dari BE (di mock PNG 1×1) tidak ditampilkan lagi; QR digambar di FE dari `qr_value` (`qrcode-generator`) dengan kode tiket di bawahnya, `qr_code` hanya cadangan. commitlint menerima `[#66][nama]` dan tidak lagi `NO-JIRA`; 7 commit branch ini ditulis ulang dengan nomor issue (pemetaan perkiraan).
- **Review manusia**: Isi `qr_value` memuat NIK lengkap dan sekarang tertanam di QR yang tampil di layar (sama dengan yang dipindai di gerbang); perlu dipastikan dengan BE. Pemetaan commit ke issue (#28, #30, #59, #60, #65, #66, #68) belum dikonfirmasi.

## 2026-11-11 — Estimasi waktu tunggu antrian mengikuti kontrak §3.5

- **Tool**: Claude Code (Claude Fable 5.2)
- **Oleh**: zaki
- **Tujuan**: Estimasi di Waiting Room belum mengikuti rumus kontrak dan menampilkan "± 1 menit" saat laju antrian masih 0.
- **Input**: `docs/api/api-contracts.md` v2.12.0 §3.5 (salinan lokal; repo `documentations` menjawab 404 untuk akun `gh` yang aktif), kode modul `queue`.
- **Output**: (1) `queue-wait.rules.ts`: rumus §3.5 dengan pembulatan ke atas bertingkat (5, 10, 30 menit), jam untuk 60–180 menit, dan "Lebih dari 3 jam". (2) `ratePerMin <= 0` menampilkan "Menghitung estimasi antrean…"; posisi 0 menampilkan "Giliran Anda sebentar lagi". (3) `ratePerMin` kini dibaca dari tiap pesan stream dan disimpan di tiket; sebelumnya laju hanya diambil sekali saat join. Selama laju 0, snapshot `/queue/me` mengambil ulang `/queue/serving`. (4) State `waiting` membawa `ratePerMin` menggantikan `etaSeconds`. (5) Mock skenario `queue-stuck` melaporkan laju 0.
- **Review manusia**: Teks memakai karakter elipsis (…) seperti teks lain, bukan tiga titik. Diperiksa di browser hanya untuk laju 0 (mock `?scenario=queue-stuck`); tampilan jam dan "lebih dari 3 jam" hanya lewat tes. Belum dicoba dengan BE asli karena `/queue/*` di gateway uji masih 404. Enum `queue_state` baru (`SCHEDULED`, `QUEUE_FULL`, `FULL_BOOKED`, `CLOSED`) belum dikerjakan: menunggu spesifikasi Apidog terbaru.

## 2026-11-11 — Integrasi dengan backend asli di gateway uji AWS

- **Tool**: Claude Code (Claude Fable 5.2)
- **Oleh**: zaki
- **Tujuan**: Menjalankan FE terhadap backend asli (Auth, Account, Event, Queue) tanpa mock.
- **Input**: Respons nyata gateway uji (GET `/events`, `/events/{id}`, `/queue/me`, join tanpa CAPTCHA, preflight CORS) dan aplikasi di peramban dengan `NEXT_PUBLIC_API_MOCKING` kosong. Repo `documentations` tetap tidak bisa dibuka (404), jadi acuannya backend yang berjalan.
- **Output**: (1) Katalog: `queue_state` memakai `SCHEDULED`, `OPEN`, `QUEUE_FULL`, `FULL_BOOKED`, `CLOSED` (nama lama v2.12 tetap diterima); backend tidak mengirim `status` dan `display` hanya berisi `enabled`, jadi tombol, chip, dan stok diturunkan dari `queue_state`. (2) `NEXT_PUBLIC_API_CREDENTIALS=omit`: gateway menjawab `Access-Control-Allow-Origin: *`, sehingga semua fetch ber-cookie ditolak peramban; di mode ini token antrian dari respons join disimpan per tab dan dikirim sebagai `X-Queue-Token`. Bawaan tetap `include` (cookie, sesuai kontrak). (3) `/queue/me` kini membawa `X-Device-Id` (backend menjawab 400 tanpanya); 401 membuang token dan tiket. (4) Stream memakai `sse_url` dari join bila ada. (5) Minta link login, kirim ulang, dan register lewat route same-origin `/api/auth/*`: backend menjawab 403 "cross-origin request rejected" bila dipanggil dari peramban. (6) Gambar event dari host luar tidak lewat pengoptimal Next.
- **Review manusia**: Diuji di peramban: Home (5 event asli), kartu event di ruang tunggu, dan minta link login (200). **Belum bisa diuji**: join antrian dari localhost, karena Turnstile menolak domain (error 110200), sehingga antrian, booking, pembayaran, dan e-tiket dengan backend asli belum tersentuh. `/queue/serving` dan `/queue/stream` 404 di gateway, jadi ruang tunggu akan memakai polling dan estimasi tetap "Menghitung" kecuali `/queue/me` atau stream memberi laju. `/events/{id}/tickets` menjawab 404 tanpa grant; detail event sudah membawa `ticket_categories`, perlu dipastikan mana yang dipakai. Lewat route same-origin, backend melihat IP server untuk rate limit auth. Mock MSW masih memakai bentuk v2.12.
- **Tambahan (cek Apidog dan uji ulang)**: Apidog (environment `aws-soldev`) memakai `FULL_QUEUE`, bukan `QUEUE_FULL`, untuk `queue_state`; skema katalog kini menerima keduanya. `GET /events` dan `GET /events/{id}` berjawab 200 dari gateway uji. Setelah `localhost` ditambahkan ke hostname Turnstile, join antrian guest berhasil di Chrome (error 110200 hilang); browser tertanam masih gagal dengan 600010. Halaman booking berhenti di `GET /events/{id}/tickets` (404). `/queue/stream` diblokir CORS di gateway. Link login dari Apidog web ditolak 403 (header Origin); lewat route `/api/auth/magic-link` backend menjawab 200, tetapi email belum diterima.

## 2026-11-11 — Landing page, animasi logo, dan pratinjau template email

- **Tool**: Claude Code (Claude Sonnet 5.5)
- **Oleh**: zaki
- **Tujuan**: Merapikan landing page, menganimasikan logo saat di-hover, memperbaiki animasi, dan menyediakan halaman untuk melihat template email.
- **Output**: (1) Logo (`BrandLink`): tiga batang bergerak bertahap saat hover/fokus, tile logo miring sedikit; mati bila `prefers-reduced-motion`. (2) Hero: lapisan gradien, eyebrow berbentuk pil, tombol "Lihat event" yang menggulir ke daftar, masuk bertahap. Kartu event masuk bertahap (jeda dibatasi 8 langkah) dan terangkat saat hover; animasi memakai `fill-mode-backwards` dan `motion-reduce`. (3) `/dev/emails` menampilkan keempat template MJML dalam iframe dengan data contoh (`emails/preview.mjs`), dan `/dev/emails/[name]` memberi HTML utuh. Keduanya 404 di build produksi (`NODE_ENV`).
- **Review manusia**: Logo pratinjau email adalah SVG (`public/images/logo-rusuh.svg`) dan QR contoh palsu; `logoUrl` produksi tetap harus PNG. Pratinjau memakai tampilan browser, bukan klien email sungguhan (Gmail/Outlook belum dicek). Tulisan di `src/app/dev` mengandung `process.env.NODE_ENV` di luar `app-config.reader.ts`; lint lolos, tetapi perlu disetujui.

## 2026-11-11 — Gerbang satu arah booking ↔ Waiting Room

- **Tool**: Claude Code (Claude Sonnet 5.5)
- **Oleh**: zaki
- **Tujuan**: Customer yang sudah punya grant tidak boleh kembali ke Waiting Room; diarahkan ke booking lagi.
- **Output**: `proxy.ts` meredirect `/events/{id}/queue` ke `/book` bila cookie `access_token` ada. Route `POST /api/session/end`, `SessionProtocol.end()`, `EndSessionUseCase`, dan `CredentialStore.clearGrantToken()` melepas grant. Controller booking memanggilnya sebelum antre lagi saat `ACCESS_EXPIRED` (tanpa itu cookie memantulkan customer ke `/book` dalam lingkaran). Bila pelepasan gagal, controller tidak berpindah. Test proxy, route, service, use case, dan controller booking; dokumen `routing-and-layers.md` diperbarui.
- **Review manusia**: Menunggu review. Test unit (521) dan tsc lulus; E2E (`e2e/expiry-and-guards.spec.ts`) dan alur di browser belum dijalankan. Cookie hanya diperiksa keberadaannya, jadi cookie basi masih memantulkan `/queue` ke `/book` sampai API menolak dan controller melepasnya. Alur lain yang menuju `/queue` dengan grant aktif (kartu event di Beranda, tautan dari akun) kini langsung masuk `/book`.

## 2026-11-12 — Batas 15 event di Home dan halaman semua event

- **Tool**: Claude Code (Claude Sonnet 5.5)
- **Oleh**: zaki
- **Tujuan**: Home menampilkan maksimal 15 event terbaru dengan tombol lihat semua; halaman semua event dengan filter kategori dan cari di FE.
- **Output**: (1) `HOME_EVENT_LIMIT = 15` dan `event.rules.ts` (`sortByLatest`, `latestEvents`). (2) Tombol "Lihat semua event" di `HomeView`. (3) Route `/events` (`AllEventsContainer`, `AllEventsView`); `EventGrid` mendapat kotak cari opsional (nama, lokasi, kategori) yang bisa digabung dengan filter kategori. (4) Teks id/en dan test.
- **Review manusia**: Kontrak tidak punya `created_at`, jadi "terbaru" = `sale_starts_at` terbaru, jatuh ke tanggal event. Diperiksa di browser dengan mock (5 event); batas 15 hanya lewat unit test. Menu navbar "Jelajahi event" masih mengarah ke `/`.

## 2026-11-12 — Redirect link login email `/auth/login?token=`

- **Tool**: Claude Code (Claude Sonnet 5.5)
- **Oleh**: zaki
- **Tujuan**: Link login di email backend (`/auth/login?token=...`) menjawab 404 di FE.
- **Output**: Route `GET /auth/login` mengalihkan (303) ke `/login/verify#token=...`, `Cache-Control: no-store`, `Referrer-Policy: no-referrer`. Test route.
- **Review manusia**: Token sekali melewati server FE sebagai query sebelum dipindah ke fragmen, kompromi dari ADR-0023. Perbaikan bersih: backend memakai `/login/verify#token=...`. Belum diuji dengan token email asli.

## 2026-11-12 — Link login email langsung masuk dan ke beranda

- **Tool**: Claude Code (Claude Sonnet 5.5)
- **Oleh**: zaki
- **Tujuan**: Link `/auth/login?token=` dari email langsung menyelesaikan login (token lewat cookie, bukan body) dan mengalihkan ke beranda tanpa layar konfirmasi.
- **Output**: `accountGateway.verifyLink` (memakai `redeem` yang sama dengan `verify`) dan route `GET /auth/login` menggantikan redirect fragmen. Test gateway dan route. ADR-0023 diberi catatan pembaruan.
- **Review manusia**: Spesifikasi Apidog tidak bisa dibuka dari sesi ini; acuannya backend yang berjalan (`GET /auth/verify` menjawab 400 "magic_token cookie is required" tanpa cookie, 401 untuk token palsu). Diuji di dev server hanya dengan token palsu (303 ke `/login/verify`); login dengan token email asli belum dicoba. Keamanan: pemindai email bisa menghanguskan token sebelum customer mengklik.

## 2026-11-12 — Verify email, layar sukses magic link, alur antrian, dan fallback booking

- **Tool**: Claude Code (Claude Fable 5.2 untuk analisis dan desain; tiga subagent Claude Sonnet 5.5 untuk implementasi auth, queue, booking+home)
- **Oleh**: zaki
- **Tujuan**: Sepuluh perbaikan alur: layar sukses verifikasi email dan magic link dengan hitung mundur, modal timeout booking, email dan pilihan identitas untuk customer login, urutan join → stream → `/queue/me`, modal tiket habis di antrian, gerbang booking, dan tombol coba lagi di Beranda.
- **Output**: (1) Auth: `/register/verified` menghitung mundur 10 detik ke `/login` dengan tombol "Kembali ke beranda"; route alias `GET /auth/verify-email?token=`; `GET /auth/login?token=` kini mendarat di `/login/verify?signedIn=1[&next=]` (5 detik, `next` disaring `safeRedirectPath`). (2) Queue: `QueueProtocol.join/getOwnState/getState`, `joinQueueUseCase`, stream dibuka setelah join (`useLiveUpdates.enabled`) memakai `sse_url`, `/queue/serving` hanya polling cadangan dengan interval dari `poll_tiers`, modal tiket habis/penjualan berakhir dengan hitung mundur 10 detik, masuk booking memakai `replace`. (3) Booking: modal timeout 5 detik ke Beranda (grant dilepas), email akun read-only, select pemegang tiket selalu ada untuk customer login (NIK pemesan, alias, NIK lain + tombol "Verifikasi Dukcapil"), submit memakai `replace`. (4) Home dan semua event: tombol "Coba lagi". (5) Sesi akun membawa `nik` lengkap bila BE mengirimnya (asumsi baru di `contract-assumptions.md`). Test unit/controller dan spek E2E `expiry-and-guards`, `saved-nik` disesuaikan.
- **Review manusia**: Menunggu review. Lint, tsc, dan 633 test Vitest lulus. E2E `mobile-chrome` dengan mock: 44 lulus, 4 gagal yang juga gagal sebelum perubahan ini (`home.spec.ts:4`, `responsive.spec.ts:141` dan `:184`, `session.spec.ts:49`); viewport lain belum dijalankan. Belum diuji terhadap backend asli. Perlu dikonfirmasi BE: path link email verifikasi (`/auth/verify-email` adalah dugaan) dan apakah `user.nik` di `GET /auth/verify` NIK lengkap (tanpa itu opsi "NIK pemesan" tidak muncul). Mock `/queue/serving` tidak memajukan `now_serving`. `.env.local` mematikan mock, jadi E2E lokal harus dijalankan dengan `NEXT_PUBLIC_API_MOCKING=enabled`.

## 2026-11-12 — Pemberitahuan antrian macet, stream SSE berheader, dan batas nama alias

- **Tool**: Claude Code (Claude Sonnet 5.5)
- **Oleh**: zaki
- **Tujuan**: Ruang tunggu memberi tahu bila posisi tidak bisa diperbarui; autentikasi stream SSE tanpa cookie; nama alias maksimal 50 karakter dan alfanumerik.
- **Output**: (1) Queue: pemberitahuan "pembaruan berhenti" dengan tombol "Perbarui sekarang" saat stream tidak tersambung dan `/queue/serving` gagal. (2) `openFetchEventStream`: stream SSE lewat `fetch` dengan `X-Queue-Token` dan `X-Device-Id` bila `apiCredentials = omit` (`EventSource` tidak bisa menyetel header), sambung ulang berjitter dengan `Last-Event-ID`, berhenti pada 401/403/404/410. (3) Alias: maksimal 50 karakter, hanya huruf, angka, dan spasi; nama otomatis `NIK ••1234` menjadi `NIK 1234` supaya lolos aturan itu.
- **Review manusia**: Spasi diizinkan sebagai asumsi (nama orang berspasi); perlu konfirmasi produk. Kontrak v2.12.1 tidak punya field nama sama sekali, hanya `label` alias. Stream berheader belum diuji ke server asli: butuh `queue_token` valid, dan ELB SSE saat ini http tanpa header CORS (OPTIONS 405), jadi browser di halaman HTTPS tetap memblokirnya sampai backend memperbaikinya. Penanganan error per `meta.error_code` (mis. `DEVICE_MISMATCH`, `DUKCAPIL_UNAVAILABLE`, `TICKETS_UNAVAILABLE`) belum diaudit tuntas.

## 2026-11-13 — Sebelas perbaikan alur: grant per event, antrian beku, logout, NIK profil, detail event

- **Tool**: Claude Code (Claude Fable 5.2 untuk analisis, fondasi, tinjauan, dan e2e; empat subagent Claude Sonnet 5.5 untuk queue+grant, booking, auth, catalog)
- **Oleh**: zaki
- **Tujuan**: Sebelas bug dari uji manual: ikon Signal di semua modal, Waiting Room beku saat sudah GRANTED/SELECTING, booking tanpa grant token, Back dari booking, halaman detail event, NIK profil di Detail Ticket, logout yang menyisakan profil, tamu melewati antrian, tombol Verifikasi Dukcapil untuk tamu dengan jeda 3 detik, alias 50 karakter alfanumerik, email 50 karakter.
- **Output**: (1) `AppProviders`: satu container dan satu QueryClient untuk semua layout di browser; sebelumnya per layout, sementara Next menyimpan sampai tiga route tersembunyi (Activity), jadi logout dan grant tidak terlihat route lain. (2) Grant terikat event: cookie `access_event`, `proxy.ts` hanya membuka `/book` event pemilik grant, credential store menyimpan event pemilik grant, `/api/session/end` bersyarat, `resetSessionUseCase` saat keluar akun. (3) Queue: penjaga auto-masuk tidak bertahan lintas hide/show, hasil admitted/ended lama selalu ditanyakan ulang, `/queue/me` ditanya tiap 1 detik saat posisi 0, state `LAPSED`/`ABANDONED` dipetakan, Waiting Room langsung meneruskan ke booking bila grant event itu masih dipegang. (4) Booking: grant dipulihkan dari `/queue/me` sebelum `/tickets`; pemegang tiket dari profil memakai `saved_nik_id` / `use_account_nik` (API tidak pernah mengirim NIK lengkap); tombol "Verifikasi Dukcapil" untuk semua NIK ketikan dengan `NIK_VERIFY_COOLDOWN_MS`; email pemesan maksimal 50. (5) Auth: fetch sesi dibatalkan sebelum cache dikosongkan, dialog coba lagi bila logout gagal, sanitasi alias di input, `EMAIL_MAX_LENGTH` di login dan register. (6) Catalog: halaman `/events/{eventId}` dan tautan dari kartu event. (7) `ActionDialog`: `illustration` wajib, jalur ikon dalam lingkaran dihapus. Mock, `openapi.json`, `contract-assumptions.md`, `action-dialog.md`, test unit/controller, dan spek e2e disesuaikan.
- **Review manusia**: Menunggu review. Format, lint, tsc, 818 test Vitest, dan `next build` (Home tetap statis) lulus. E2E `mobile-chrome` dengan mock (Chromium): gagal `home.spec.ts:4`, `responsive.spec.ts:184`, `session.spec.ts:49` (sudah gagal sebelum sesi ini) dan `expiry-and-guards` "waktu pembayaran habis" (spek lama bertentangan dengan redirect ke Beranda dari PR #94); viewport lain belum dijalankan. Belum diuji terhadap backend asli. Perlu diputuskan: (a) `saved_nik_id` / `use_account_nik` butuh `Authorization: Bearer` di `GET /tickets` dan `POST /bookings`, sedangkan token akun ada di cookie httpOnly, jadi dengan BE asli kursi dari profil kemungkinan ditolak sampai dua endpoint itu lewat route same-origin; mock menerimanya tanpa Bearer. (b) Spasi di alias tetap diizinkan (asumsi). (c) Halaman pembayaran masih bisa mengirim `x-grant-token` kosong bila tab tidak memegang grant. E2E lokal butuh `NEXT_PUBLIC_API_MOCKING=enabled NEXT_PUBLIC_API_BASE_URL=https://api.rusuh.test NEXT_PUBLIC_API_CREDENTIALS=include` karena `.env.local` mengarah ke gateway nyata.
