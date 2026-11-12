# ADR-0023: Login magic link mengikuti kontrak API, dengan token disimpan lewat route same-origin

- **Status**: Proposed
- **Tanggal**: 2026-11-01
- **Pengambil keputusan**: Tim FE Web dan BE
- **Requirement terkait**: FR-29, FR-30, FR-31, BR-07, BR-09, [kontrak API v2.1 §1](https://github.com/PTServerJanganTumbang-BookingTicket/documentations/blob/main/api/api-contracts.md), [update requirement §2](https://github.com/PTServerJanganTumbang-BookingTicket/documentations/blob/main/requirement/update-requirement-rusuh-booking-tiket.md), [ADR-0007](0007-rendering-strategy.md), [ADR-0008](0008-webview-payment-embed.md), [ADR-0009](0009-contract-first-openapi-msw.md), [ADR-0010](0010-login-single-session-progress-persistence.md), [ADR-0011](0011-nik-linked-to-account.md)

## Konteks

Login dan register belum dibangun di FE ([status](../architecture/auth-login-register.md)). Keputusannya sudah ada di repo [`documentations`](https://github.com/PTServerJanganTumbang-BookingTicket/documentations):

- **Login tanpa kata sandi lewat magic link.** Kontrak mendefinisikan `POST /auth/magic-link`, `POST /auth/magic-link/resend`, `GET /auth/verify`, dan `POST /auth/register`.
- **Login bersifat opsional**, dikonfirmasi CEO. Customer bisa antre dan membeli sebagai tamu. Akun memberi Daftar NIK Teman, NIK terisi otomatis, dan pemulihan antrian lintas perangkat.
- **Token ada di body response.** Kontrak §9 meminta klien menyimpan access token dan mengirimnya lewat `Authorization: Bearer`, dengan `expires_in` 300 detik dan refresh token.

Yang tersisa untuk diputuskan FE web adalah cara menyimpan token, karena aturan repo ini melarang token di `localStorage`, Context, dan URL (ADR-0007, ADR-0008). Beberapa bagian kontrak juga belum cukup untuk dibangun; lihat "Usulan perubahan kontrak".

## Opsi yang dipertimbangkan

1. **Menyimpan token di memori atau `localStorage`, sesuai pembacaan langsung kontrak §9.** Paling sedikit kode. Token di `localStorage` bisa dibaca XSS. Token di memori hilang saat halaman dimuat ulang, sehingga login tidak bertahan saat kembali dari aplikasi bank, dan Server Component serta `proxy.ts` tidak bisa melihatnya.
2. **Route same-origin menyimpan token di cookie `httpOnly`, dan Next meneruskan permintaan ke BE dengan `Authorization: Bearer`** (dipilih). Token tidak terjangkau JavaScript dan bertahan saat dimuat ulang. Biayanya satu lapisan route untuk endpoint yang butuh identitas akun.
3. **BE menyetel cookie `httpOnly` sendiri.** Tidak butuh lapisan route, tetapi mengubah kontrak mobile dan menuntut domain API dan web berbagi cookie.

## Keputusan

**Opsi 2: FE web memakai endpoint magic link dari kontrak apa adanya, dan token akun hanya hidup di cookie `httpOnly` yang dikelola route same-origin.**

1. **Kontrak API adalah sumber kebenaran.** FE tidak menambah endpoint auth sendiri. Perubahan diusulkan ke repo `documentations`, bukan dibangun lebih dulu.
2. **Login tidak menjadi gerbang.** Home, antrian, booking, dan pembayaran tetap bisa dijalani tamu. `proxy.ts` tidak mengarahkan tamu ke `/login`. Halaman yang memang butuh akun, seperti Daftar NIK Teman dan riwayat tiket, yang meminta login.
3. **Dua jenis token tetap terpisah.** `queue_token` adalah cookie milik BE dan tidak disentuh FE. Token akun disimpan route same-origin, dengan nama cookie yang tidak bertabrakan dengan token antrian.
4. **Penyimpanan token akun.** Cookie `httpOnly`, `secure` di production, `sameSite=lax` supaya terbawa saat datang dari link email. Refresh token memakai cookie terpisah dan hanya dikirim ke route pembaruan.
5. **`redirect_context` dari `GET /auth/verify` menentukan tujuan setelah login** (BR-09). FE hanya menerima tipe yang dikenal dan membangun path sendiri, bukan mengikuti URL dari response.
6. **Mobile tidak berubah.** Aplikasi tetap memakai token di body sesuai kontrak. WebView pembayaran tetap memakai one-time code (ADR-0008).

### Pemetaan ke kontrak

| Kebutuhan | Endpoint kontrak | Di FE |
|---|---|---|
| Minta link | `POST /auth/magic-link` | Form email di `/login`, layar "cek email" |
| Kirim ulang | `POST /auth/magic-link/resend` | Tombol di layar "cek email"; jeda dari `retry_after` pada 429 |
| Verifikasi | `GET /auth/verify` | Route same-origin, menyetel cookie lalu mengarahkan sesuai `redirect_context` |
| Daftar | `POST /auth/register` | Form email, NIK, dan persetujuan yang tidak tercentang otomatis |
| NIK teman | `/accounts/me/saved-niks` | Halaman akun, hanya untuk customer login |

### Usulan perubahan kontrak

Bagian ini belum disepakati BE dan perlu dibawa ke repo `documentations`.

| # | Masalah pada kontrak | Usulan |
|---|---|---|
| 1 | `GET /auth/verify` membaca `magic_token` dari cookie, padahal link di email tidak bisa menyetel cookie. Bagian ini juga menulis header `Cookies` dua kali | Tetapkan cara token sampai ke endpoint, misalnya body atau fragmen URL yang dibaca halaman FE |
| 2 | Verifikasi lewat `GET`. Pemindai email yang membuka link bisa menghanguskan token sekali pakai sebelum customer mengkliknya | Link membuka layar konfirmasi di FE, dan token dipakai lewat `POST` saat tombol ditekan |
| 3 | Tidak ada endpoint untuk memakai `refresh_token`, padahal access token hanya berlaku 300 detik | Tambah endpoint pembaruan dan logout |
| 4 | Tidak ada endpoint profil. Data user hanya ada pada response verifikasi | Tambah `GET /accounts/me` |
| 5 | Response `GET /auth/verify` menamai token `access_token`, sementara glosarium membedakan identity token dan access token booking | Tegaskan token mana yang dikembalikan |
| 6 | Link hanya bisa dipakai di perangkat yang membuka email. Di aplikasi mobile, link bisa terbuka di browser | Pertimbangkan kode sekali pakai sebagai cadangan, atau tegaskan bahwa ini diterima |
| 7 | Kontrak tidak menyebut satu sesi aktif per akun maupun `SESSION_REVOKED` dari ADR-0010 | Putuskan apakah aturan itu masih berlaku |

## Konsekuensi

- **Positif**: FE dan BE memakai satu kontrak. Token akun tidak terjangkau XSS. Customer yang tidak login tidak bergantung pada kecepatan email saat penjualan dibuka.
- **Negatif**: ada lapisan route tambahan untuk endpoint yang butuh identitas akun, dan beban lewat lapisan itu harus diperhitungkan saat flash crowd. Endpoint antrian tidak melewatinya.
- **Negatif**: customer login yang harus masuk ulang saat penjualan dibuka masih bergantung pada kecepatan email. Mereka tetap bisa lanjut sebagai tamu, tetapi kehilangan NIK teman dan pemulihan lintas perangkat.
- **Yang harus dijaga**:
  - Test Playwright: tamu menyelesaikan alur tanpa diarahkan ke `/login`, dan `redirect_context` yang tidak dikenal berakhir di Home.
  - Tidak ada token akun di `localStorage`, Context, URL, query key, atau log.
  - Handler MSW mengikuti bentuk `{ meta, data }` dari kontrak.
  - Setelah Accepted: perbarui bagian token di `.kiro/steering/architecture-rules.md`.

## Pertanyaan terbuka

| # | Pertanyaan | Pemilik |
|---|---|---|
| 1 | Usulan perubahan kontrak 1–7 di atas | BE |
| 2 | Berapa lama magic link berlaku, dan berapa batas kirim ulangnya? `emails/login-link.mjml` memakai `{{expiryMinutes}}` | BE |
| 3 | Apakah verifikasi email saat registrasi langsung membuat customer masuk? | BE, FE |
| 4 | Apakah refresh token bisa dipakai untuk WebView, atau WebView tetap hanya lewat one-time code? | BE, M |

## Pembaruan 2026-11-12: link email dari backend ditukar langsung di server

Backend membuat link email `/auth/login?token=...` (query, bukan fragmen) dan `GET /auth/verify` hanya membaca cookie `magic_token`. Route `GET /auth/login` menukar token di server lewat cookie `magic_token`, menyetel cookie akun, lalu mengalihkan (303) ke beranda, atau ke booking yang dipulihkan (BR-09). Tidak ada layar konfirmasi pada jalur ini. Token gagal atau tanpa token menuju `/login/verify`.

**Harga yang diterima:** token sempat lewat sebagai query di server FE dan log akses, dan pemindai email yang membuka link bisa menghanguskan token sebelum customer mengklik (butir 2 di atas). Layar konfirmasi di `/login/verify#token=...` tetap ada untuk link berbentuk fragmen.
