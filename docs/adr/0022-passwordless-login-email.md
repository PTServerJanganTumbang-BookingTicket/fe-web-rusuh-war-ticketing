# ADR-0022: Login passwordless dengan link dan kode sekali pakai lewat email

- **Status**: Proposed
- **Tanggal**: 2026-11-01
- **Pengambil keputusan**: Tim FE Web dan BE, perlu dikonfirmasi klien
- **Requirement terkait**: Req 1 AC2, AC7, AC8, Req 7 AC5, MoM 2026-10-28 (butir 15, 16, Token), [ADR-0007](0007-rendering-strategy.md), [ADR-0008](0008-webview-payment-embed.md), [ADR-0009](0009-contract-first-openapi-msw.md), [ADR-0010](0010-login-single-session-progress-persistence.md), [ADR-0011](0011-nik-linked-to-account.md)

## Konteks

Login dan register belum dibangun ([status](../architecture/auth-login-register.md)), dan metode kredensial masih terbuka. Tim ingin login tanpa kata sandi, sementara `design.md` masih memakai `login(email, password)`.

Batasan yang memengaruhi keputusan:

- **Flash crowd.** Customer tidak boleh kehilangan giliran karena proses masuk ("Jangan PHP"). Req 7 AC5 mengizinkan Email_Service mengirim sampai 5 menit, dan itu terlalu lama untuk login.
- **Pemindai keamanan email** sering membuka link secara otomatis, sehingga link sekali pakai bisa hangus sebelum diklik customer.
- **Token tidak boleh di URL** kecuali one-time code (ADR-0008).
- **Satu sesi aktif per akun** (ADR-0010): login baru mencabut sesi lama.
- **Beda perangkat.** Email sering dibuka di ponsel, sementara customer mulai dari laptop. Di aplikasi mobile, link bisa terbuka di browser, bukan di dalam app.
- Req 1 AC7 mewajibkan verifikasi email saat registrasi memakai link, bukan OTP.

## Opsi yang dipertimbangkan

1. **Email dan kata sandi.** Tidak bergantung pada kecepatan email. Tim harus mengelola penyimpanan hash, reset kata sandi, dan serangan credential stuffing, dan tetap butuh email untuk verifikasi dan reset.
2. **Link saja.** Paling sederhana bagi customer di perangkat yang sama. Gagal saat email dibuka di perangkat lain, dan menjadi jalan buntu di aplikasi mobile.
3. **Kode saja.** Tahan beda perangkat dan aman dari pemindai, tetapi customer harus mengetik kode setiap kali.
4. **Link dan kode dalam satu email** (dipilih). Link untuk perangkat yang sama, kode untuk perangkat lain. Biayanya dua cara masuk yang harus dibangun dan diuji.
5. **SSO atau penyedia identitas pihak ketiga.** Mengurangi pekerjaan tim, tetapi belum diketahui ada yang tersedia ([overview §7](../architecture/overview.md)), dan tetap perlu mengikat NIK ke akun. Dipertimbangkan ulang bila SSO tersedia.

## Keputusan

**Opsi 4: customer masuk dengan email, lalu memakai link atau kode sekali pakai dari satu email yang sama. Tidak ada kata sandi.**

Angka di bawah adalah usulan FE dan perlu dikonfirmasi BE.

### Alur

```
Perangkat customer                 FE (route same-origin)          BE
  │ isi email di /login                  │                          │
  │ ─────────────────────────────────────┼─ POST /auth/login/request►│ kirim email
  │ ◄── "cek email" + form kode ─────────┼── 202 ───────────────────│
  │                                      │                          │
  │ A. buka link /login/verify#code      │                          │
  │    layar konfirmasi, tekan "Masuk" ─►│ POST /api/auth/verify ──►│ cabut sid lama
  │                                      │                          │ terbitkan sid baru
  │ B. ketik kode di form ──────────────►│ POST /api/auth/verify ──►│
  │ ◄── cookie identity httpOnly ────────│ ◄── identity token ──────│
  │ ◄── arahkan ke returnTo ─────────────│                          │
```

### Aturan

1. **Membuka link tidak memakai kredensial.** Halaman link hanya menampilkan layar konfirmasi, dan kredensial baru dipakai saat tombol "Masuk" ditekan. Pemindai email yang membuka URL tidak menghanguskannya.
2. **Kode di link ada di fragmen URL (`#`), bukan query.** Fragmen tidak terkirim ke server, log, atau header `Referer`. Halaman membacanya di browser lalu menghapusnya dari address bar. Ini memperluas pengecualian one-time code ADR-0008.
3. **Sekali pakai dan berumur pendek.** Link dan kode adalah satu kredensial yang berlaku 15 menit. Keduanya hangus saat salah satu dipakai, saat permintaan baru dibuat, atau setelah 5 kali salah. Kode 6 digit dari pembangkit acak kriptografis, dan BE hanya menyimpan hash-nya.
4. **Permintaan login tidak membocorkan keberadaan akun.** `POST /auth/login/request` selalu menjawab 202 dengan bentuk yang sama, dan email berisi ajakan mendaftar bila akun belum ada.
5. **Pembatasan laju.** BE membatasi per email dan per IP, misalnya 3 permintaan per email per 15 menit. CAPTCHA adaptif (MoM butir 16) memakai mekanisme yang sama.
6. **Sesi dicabut saat login selesai, bukan saat diminta.** Permintaan link tidak mengeluarkan perangkat mana pun, sehingga orang lain tidak bisa mengganggu sesi hanya dengan mengetahui email customer. Layar konfirmasi menyebut bahwa perangkat lain akan keluar dan progres tetap aman (ADR-0010).
7. **Perangkat yang meminta tidak masuk otomatis saat link dibuka di perangkat lain.** Sesi hanya aktif di perangkat yang menekan "Masuk" atau mengetik kode. Menyambungkan dua perangkat otomatis membuka celah phishing, karena korban bisa memberi akses ke perangkat penyerang dengan sekali klik.
8. **`returnTo` hanya path relatif internal**, disimpan BE bersama kredensial dan divalidasi FE untuk mencegah open redirect. Tujuan tetap mengikuti status dari server (ADR-0010).
9. **Identity token di cookie tersendiri.** `httpOnly`, `secure` di production, `sameSite=lax`, disetel route handler same-origin sejajar dengan `/api/session/start`, dan terpisah dari cookie `access_token` antrian (MoM: dua token). `sameSite=strict` tidak dipakai agar sesi terbawa saat customer datang dari link di email.
10. **Email login diprioritaskan.** BE mengirimnya lewat antrean terpisah dari e-tiket, dengan target kurang dari 30 detik. Layar "cek email" punya tombol kirim ulang dengan jeda dari respons server.
11. **Register tetap memakai link.** Sesuai Req 1 AC7-8, verifikasi email berupa link 24 jam tanpa kode, maksimal 3 kirim ulang per jam, dan juga melewati layar konfirmasi agar aman dari pemindai. Form register berisi email, NIK, dan persetujuan data pribadi.
12. **Hanya email untuk versi pertama.** Definisi Akun_Customer menyebut "email/nomor HP", tetapi nomor HP butuh penyedia SMS dan biaya sendiri.
13. **WebView tidak login sendiri.** Sesi WebView tetap turunan sesi app lewat one-time code (ADR-0008). Login di aplikasi mobile memakai kode.

### Kontrak yang diminta dari BE

| Method | Path | Keterangan |
|---|---|---|
| POST | `/auth/login/request` | Body `email`, `returnTo`. Selalu 202, dengan `resendAvailableAt` |
| POST | `/auth/login/verify` | Body `code` (dari link atau ketikan). Mencabut `sid` lama, mengembalikan identity token dan `returnTo` |
| POST | `/auth/register` | Body email, NIK, persetujuan. Mengirim link verifikasi |
| POST | `/auth/verification/resend` | Maksimal 3 kali per jam |
| POST | `/auth/logout` | Mencabut `sid` |

Kode error baru untuk katalog ADR-0009:

| Kode | HTTP | Arti |
|---|---|---|
| `LOGIN_CODE_INVALID` | 400 | Kode salah, kedaluwarsa, atau sudah dipakai. Satu kode supaya tidak membocorkan status |
| `LOGIN_RATE_LIMITED` | 429 | Terlalu banyak percobaan |
| `EMAIL_NOT_VERIFIED` | 403 | Akun belum memverifikasi email |
| `SESSION_REVOKED` | 401 | Dari ADR-0010 |

## Konsekuensi

- **Positif**: tidak ada kata sandi yang disimpan atau bocor, dan tidak ada alur reset kata sandi. Registrasi dan login memakai layanan email yang sama.
- **Negatif**: gangguan email berarti customer yang keluar tidak bisa masuk lagi. Sesi yang sudah aktif tetap berjalan, jadi tim perlu menyarankan customer masuk sebelum penjualan dibuka, dan umur sesi harus cukup panjang.
- **Negatif**: akses ke kotak surat sama dengan akses ke akun, termasuk NIK tersamar dan e-tiket. Perubahan email harus lewat proses verifikasi seperti perubahan NIK (Req 1 AC4).
- **Negatif**: BE menanggung penyimpanan kredensial sekali pakai, pembatasan laju, dan antrean email prioritas.
- **Negatif**: fragmen URL butuh JavaScript untuk dibaca. Tanpa JavaScript, customer masih bisa mengetik kode di halaman yang meminta login.
- **Yang harus dijaga**:
  - Test Playwright: membuka link tanpa menekan "Masuk" tidak menghanguskan kredensial, kode dari perangkat lain berhasil, dan `returnTo` eksternal ditolak.
  - Test `data`: pemetaan setiap kode error baru ke `AppError`.
  - Skenario MSW `login-code-invalid`, `login-rate-limited`, `email-not-verified`, dipakai test dan demo.
  - Setelah Accepted: perbarui pengecualian token di `docs/ai/steering/architecture-rules.md`, dan tambahkan `{{loginCode}}` ke `emails/login-link.mjml`.

## Pertanyaan terbuka

| # | Pertanyaan | Pemilik | Menghambat |
|---|---|---|---|
| 1 | Apakah klien menerima login tanpa kata sandi? | K | Status Accepted |
| 2 | Bolehkah guest antre, booking, dan bayar (MoM Q1)? Ini menentukan gerbang login di `proxy.ts`: sebelum antre atau sebelum booking | K, T | Gerbang login |
| 3 | Sanggupkah BE menjamin email login di bawah 30 detik saat flash crowd? Bila tidak, apa cadangannya? | BE | Status Accepted |
| 4 | Umur identity token dan perlu tidaknya refresh token (ADR-0010, MoM Q15) | BE | Route cookie |
| 5 | Apakah verifikasi email langsung membuat customer masuk, dan apakah akun belum terverifikasi boleh antre (MoM Q19)? | K, BE | Alur register |
| 6 | Apakah nomor HP wajib sebagai identitas login? | K | Lingkup versi pertama |
| 7 | Bagaimana login di aplikasi mobile: hanya kode, atau juga universal link? | M, BE | ADR-0008 |
