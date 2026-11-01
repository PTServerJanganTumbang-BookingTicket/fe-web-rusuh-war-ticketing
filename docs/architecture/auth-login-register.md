# Login dan Register

Status: **login dan register belum diimplementasikan.** Yang ada hanya rute `/login` berisi placeholder dan mekanisme cookie sesi. Dokumen ini memisahkan dengan tegas: (A) apa yang sudah ada di kode, (B) rancangan yang belum dibangun, dan (C) yang masih terbuka. Tanggal acuan: 2026-11-01.

Sumber kebenaran endpoint adalah [kontrak API §1](https://github.com/PTServerJanganTumbang-BookingTicket/documentations/blob/main/api/api-contracts.md) di repo `documentations`.

## A. Yang sudah ada di kode

| Bagian | Lokasi | Keadaan |
|---|---|---|
| Rute `/login` | `src/app/(auth)/login/page.tsx` | Merender `LoginContainer` |
| `LoginContainer` | `src/modules/auth/views/LoginContainer.tsx` | Placeholder: `ScreenPlaceholder` dengan `login.title` ("Masuk") dan `common.placeholder`. Tidak ada controller, View, form, atau test |
| Tautan masuk | `HomeView` via `loadHomeViewProps` | Tombol `home.login` ("Login") menuju `/login` |
| Cookie sesi | `src/app/api/session/start/route.ts`, `StartSessionUseCase` (`src/core/application`) + `HttpSessionService` (`src/core/data/session`) | Sudah jalan, tetapi **untuk access token antrian**, bukan token login. Lihat [routing §6](routing-and-layers.md) |
| Gerbang | `src/proxy.ts` | Memeriksa cookie `access_token` untuk `/book` dan `/pay`. Tidak mengenal login |
| i18n | `src/core/i18n/id.messages.ts` | Baru `login.title` |
| Kode error | `src/core/domain/app-error.ts` | Belum memuat kode error dari kontrak |
| Mock | `src/mocks/handlers.ts` | Tidak ada handler auth |
| Register | | Tidak ada rute. Rancangannya di [ADR-0022](../adr/0022-passwordless-login-email.md) |
| Template email | `emails/login-link.mjml`, `emails/verify-register.mjml` | Ada, tetapi belum dipakai BE |

Alur Home → Waiting Room → Booking → Payment bisa dijalani tanpa login. Ini **sesuai keputusan terbaru**: login bersifat opsional ([update requirement §2](https://github.com/PTServerJanganTumbang-BookingTicket/documentations/blob/main/requirement/update-requirement-rusuh-booking-tiket.md)).

## B. Rancangan yang belum dibangun

Sumber: kontrak API, [ADR-0010](../adr/0010-login-single-session-progress-persistence.md), [ADR-0011](../adr/0011-nik-linked-to-account.md), dan [ADR-0022](../adr/0022-passwordless-login-email.md). Ketiga ADR belum Accepted.

### B.0 Metode login ([ADR-0022](../adr/0022-passwordless-login-email.md))

Tanpa kata sandi, dan tidak wajib:

- **Login**: `POST /auth/magic-link`, customer membuka link dari email, lalu `GET /auth/verify` mengembalikan token, data user, dan `redirect_context` (BR-09).
- **Kirim ulang**: `POST /auth/magic-link/resend` dari layar "cek email". Respons 429 membawa `retry_after`.
- **Register**: `POST /auth/register` berisi email, NIK, dan persetujuan. NIK diverifikasi Dukcapil sekali di sini. Verifikasi email lewat link (FR-31).
- **Tamu**: antre dan membeli tanpa akun, mengisi NIK per tiket dan divalidasi lewat `POST /nik/validate`.

Akun memberi tiga hal yang tidak dimiliki tamu: NIK terisi otomatis tanpa panggilan Dukcapil ulang, Daftar NIK Teman (maksimal 5), dan pemulihan antrian lintas perangkat lewat `GET …/queue/me`.

### B.1 Model sesi

- **BR-07 berlaku untuk customer login**: satu keterlibatan aktif per event. Join kedua memulihkan keterlibatan yang ada, bukan ditolak.
- **Pemulihan**: `GET /events/{event_id}/queue/me` menerima `queue_token` (perangkat sama) atau identity token (perangkat lain, hanya customer login).
- **Sesi WebView turunan dari sesi app** lewat one-time code ([ADR-0008](../adr/0008-webview-payment-embed.md)), bukan login baru.
- **Satu sesi aktif per akun** (ADR-0010) belum ada di kontrak. Lihat bagian C.

### B.2 Perilaku FE yang direncanakan

1. **Login tidak menjadi gerbang.** `proxy.ts` tidak mengarahkan tamu ke `/login`. Halaman yang butuh akun, seperti Daftar NIK Teman dan riwayat tiket, yang meminta login.
2. **FE tidak membatalkan apa pun** saat token akun tidak berlaku lagi. Customer yang sudah punya slot tetap lanjut memakai `queue_token`.
3. **`redirect_context`** menentukan tujuan setelah login. FE hanya menerima tipe yang dikenal dan membangun path sendiri.
4. **Pemindai email** bisa menghanguskan link sekali pakai bila verifikasi lewat `GET`. Usulan perbaikannya ada di ADR-0022.

### B.3 Rendering dan struktur yang akan dipakai

Mengikuti pola di [routing-and-layers](routing-and-layers.md) dan ADR-0007 ("Login: Server Component + form client"):

```
src/app/(auth)/login/page.tsx               Server Component tipis → <LoginContainer />
src/app/api/auth/verify/route.ts            Memanggil BE, menyetel cookie token akun, mengarahkan sesuai redirect_context
src/modules/auth/
├─ domain/
│  ├─ account.model.ts                      tipe Account, profil (NIK tersamar)
│  └─ auth.protocol.ts                      AuthProtocol: requestMagicLink(), resendMagicLink(), register(), saved NIK
├─ application/
│  ├─ request-magic-link.use-case.ts, resend-magic-link.use-case.ts, register.use-case.ts
│  └─ auth.dependencies.ts                  AuthDependencies
├─ data/
│  ├─ http-auth.service.ts                  createHttpAuthService, implementasi AuthProtocol
│  └─ account.schema.ts                     schema zod, satisfies z.ZodType<Account>
├─ controllers/
│  ├─ login.controller.ts                   useLoginController: useDependencies<AuthDependencies>(), useMutation(requestMagicLinkUseCase), galat → t(key)
│  ├─ login.mapper.ts                       toLoginViewProps: state → props View
│  └─ __tests__/
├─ views/
│  ├─ LoginContainer.tsx                    "use client"; screen → <LoginView {...screen} />
│  └─ LoginView.tsx                         props-only, di atas Button/Card/Alert Signal DS
└─ auth.module.ts                           registrasi Awilix (skill new-module)
src/mocks/handlers.ts                       Handler /auth/* dan /accounts/me/saved-niks dengan bentuk { meta, data }
```

Route `/login` perlu `AppProviders` (dari `src/di`) di layout `(auth)/login` karena memakai `useMutation` dan container DI. Itu tidak mengganggu Home, sebab provider tidak dipasang di root.

### B.4 Cookie dan token

- **`queue_token`**: cookie milik BE, disetel saat `POST …/queue/join`. FE tidak menyentuhnya.
- **Access token booking**: diambil lewat `GET …/queue/me` setelah event `grant`.
- **Token akun**: kontrak mengembalikannya di body. FE web menyimpannya lewat route same-origin di cookie `httpOnly`, `sameSite=lax`, `secure` di production, tidak pernah di URL, `localStorage`, Context, atau log (ADR-0022). Nama cookie belum diputuskan.

`src/proxy.ts` dan `/api/session/start` masih memakai cookie `access_token` dan perlu diselaraskan saat modul antrian dan booking diintegrasikan.

### B.5 Profil dan NIK ([ADR-0011](../adr/0011-nik-linked-to-account.md))

- **BR-01**: maksimal 3 tiket per transaksi. **BR-02**: satu NIK hanya untuk satu tiket pada satu event, jadi 3 tiket butuh 3 NIK berbeda. Keduanya menggantikan aturan lama 3 tiket per NIK.
- Akun menyimpan satu NIK terdaftar, unik secara global, dan diverifikasi saat registrasi.
- Layar Detail Ticket yang ada sekarang masih memakai model lama: NIK tersamar dan kuota dari sesi booking dummy, serta `MAX_TICKETS_PER_NIK`.

### B.6 Yang perlu dari BE

Daftar lengkapnya ada di ADR-0022, bagian "Usulan perubahan kontrak": cara token magic link sampai ke verifikasi, verifikasi yang aman dari pemindai email, endpoint pembaruan token dan logout, endpoint profil, dan penamaan token.

## C. Yang masih terbuka

| Pertanyaan | Dampak |
|---|---|
| Usulan perubahan kontrak di ADR-0022 | Syarat implementasi auth |
| **Satu sesi aktif per akun** (ADR-0010) tidak ada di kontrak. Masih berlaku? | Penanganan `SESSION_REVOKED`, layar sesi dicabut, `/api/session/end` |
| Berapa lama magic link berlaku, dan batas kirim ulangnya? | Isi `emails/login-link.mjml` dan layar "cek email" |
| Apakah verifikasi email saat registrasi langsung membuat customer masuk? | Alur register |
| Apakah akun yang belum verifikasi email boleh antre? Tamu boleh, jadi akun tidak terverifikasi mungkin diperlakukan seperti tamu | Alur register |
| Cakupan matcher `proxy.ts` untuk `/m/orders/*/pay` dan `/orders/*/ticket` | Celah akses sampai ditutup |

## D. Test yang dijanjikan ADR dan belum ada

- Playwright: tamu menyelesaikan alur tanpa diarahkan ke `/login`, dan `redirect_context` yang tidak dikenal berakhir di Home.
- Controller dan data: pemetaan setiap kode error auth dari kontrak.
- Skenario MSW untuk `/auth/*`: berhasil, 429 dengan `retry_after`, `NIK_ALREADY_REGISTERED`, `CONSENT_REQUIRED`.
- Tidak ada NIK mentah atau token akun di URL, query key, `localStorage`, Context, atau log.
- Test ADR-0010 (dua browser context, `SESSION_REVOKED`) hanya bila aturan satu sesi tetap berlaku.
