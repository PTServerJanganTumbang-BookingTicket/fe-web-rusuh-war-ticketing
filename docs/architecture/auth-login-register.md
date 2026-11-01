# Login dan Register

Status: **login dan register belum diimplementasikan.** Yang ada hanya rute `/login` berisi placeholder dan mekanisme cookie sesi. Dokumen ini memisahkan dengan tegas: (A) apa yang sudah ada di kode, (B) rancangan yang sudah diputuskan di ADR tetapi belum dibangun, dan (C) yang masih terbuka. Tanggal acuan: 2026-10-26.

## A. Yang sudah ada di kode

| Bagian | Lokasi | Keadaan |
|---|---|---|
| Rute `/login` | `src/app/(auth)/login/page.tsx` | Merender `LoginContainer` |
| `LoginContainer` | `src/modules/auth/views/LoginContainer.tsx` | Placeholder: `ScreenPlaceholder` dengan `login.title` ("Masuk") dan `common.placeholder`. Tidak ada controller, View, form, atau test |
| Tautan masuk | `HomeView` via `loadHomeViewProps` | Tombol `home.login` ("Login") menuju `/login` |
| Cookie sesi | `src/app/api/session/start/route.ts`, `StartSessionUseCase` (`src/core/application`) + `HttpSessionService` (`src/core/data/session`) | Sudah jalan, tetapi **untuk access token antrian**, bukan token login. Lihat [routing §6](routing-and-layers.md) |
| Gerbang | `src/proxy.ts` | Memeriksa cookie `access_token` untuk `/book` dan `/pay`. Tidak mengenal login |
| i18n | `src/core/i18n/id.messages.ts` | Baru `login.title` |
| Kode error | `src/core/domain/app-error.ts` | Belum ada `SESSION_REVOKED` maupun kode error kredensial |
| Mock | `src/mocks/handlers.ts` | Tidak ada handler login, register, atau `/me` |
| Register | | Tidak ada rute, tidak ada ADR |

Konsekuensinya saat ini: alur Home → Waiting Room → Booking → Payment bisa dijalani **tanpa login**, padahal requirement klien mewajibkan login sebelum antre. Ini celah requirement yang diketahui, bukan perilaku yang dimaksudkan.

## B. Rancangan yang sudah diputuskan (ADR berstatus Proposed)

Sumber: [ADR-0010](../adr/0010-login-single-session-progress-persistence.md) dan [ADR-0011](../adr/0011-nik-linked-to-account.md). Keduanya belum Accepted dan menunggu konfirmasi BE dan klien, jadi anggap kontrak di bawah sebagai usulan.

### B.1 Model sesi

- **Login terakhir menang.** BE menerbitkan `sid` pada setiap login. Satu akun hanya punya satu `sid` aktif, login dari klien mana pun (web atau mobile) mencabut yang lama.
- **Progres terikat akun, bukan sesi.** Antrian, sesi booking, dan order disimpan di server dengan kunci `userId` + `eventId`. Sesi yang dicabut tidak membuang progres.
- **Sesi WebView turunan dari sesi app** lewat one-time code ([ADR-0008](../adr/0008-webview-payment-embed.md)), bukan login baru.

### B.2 Perilaku FE yang direncanakan

1. **`SESSION_REVOKED` (HTTP 401)** ditambahkan ke `ApiErrorCode`. Satu penanganan global: hapus cookie lewat route `/api/session/end`, hentikan polling, tampilkan layar "Akunmu dipakai di perangkat lain" yang menyatakan progres tetap tersimpan, dengan tombol "Masuk lagi di perangkat ini".
2. **FE tidak membatalkan apa pun** saat sesi dicabut. Tidak ada cancel, tidak ada reset state lokal.
3. **`returnTo`**: login mengingat tujuan (queue, book, atau pay) dan mengarahkan ke sana setelah berhasil. Layar tujuan mengikuti status server.
4. **Peringatan di halaman login**: masuk di perangkat ini mengeluarkan perangkat lain, progres tetap aman.
5. **Deteksi lewat polling yang sudah ada** (antrian, booking, payment), keterlambatan paling lama satu interval polling.
6. **Tab berbeda di perangkat yang sama berbagi satu cookie**, jadi bukan pengambilalihan. Perebutan slot antar tab memakai `SLOT_TAKEN_OVER`.

### B.3 Rendering dan struktur yang akan dipakai

Mengikuti pola di [routing-and-layers](routing-and-layers.md) dan ADR-0007 ("Login: Server Component + form client"):

```
src/app/(auth)/login/page.tsx               Server Component tipis → <LoginContainer />
src/modules/auth/
├─ domain/
│  ├─ account.model.ts                      tipe Account, profil (NIK tersamar)
│  └─ auth.protocol.ts                      AuthProtocol: login(), logout(), getMe()
├─ application/
│  ├─ login.use-case.ts, logout.use-case.ts, get-me.use-case.ts
│  └─ auth.dependencies.ts                  AuthDependencies
├─ data/
│  ├─ http-auth.service.ts                  HttpAuthService implements AuthProtocol
│  └─ account.schema.ts                     schema zod, satisfies z.ZodType<Account>
├─ controllers/
│  ├─ login.controller.ts                   useLoginController: useDependencies<AuthDependencies>(), useMutation(loginUseCase), returnTo, galat → t(key)
│  ├─ login.mapper.ts                       toLoginViewProps: state → props View
│  └─ *.test.ts(x)
├─ views/
│  ├─ LoginContainer.tsx                    "use client"; screen → <LoginView {...screen} />
│  └─ LoginView.tsx                         props-only, di atas Button/Card/Alert Signal DS
└─ auth.module.ts                           registrasi Awilix (skill new-module)
src/mocks/handlers.ts                       POST /auth/login, GET /me, skenario session-revoked
```

Penanganan `SESSION_REVOKED` global (B.2 butir 1) dipakai semua modul, jadi pengakhiran sesi (`/api/session/end`) masuk `SessionProtocol` di `src/core/domain`, use case di `src/core/application`, dan service di `src/core/data/session`, bukan modul `auth`, karena modul tidak boleh saling mengimpor (ADR-0014).

Route `/login` perlu `AppProviders` (dari `src/di`) di layout `(auth)/login` karena memakai `useMutation` dan container DI. Itu tidak mengganggu Home, sebab provider tidak dipasang di root.

### B.4 Cookie dan token

Token login harus ikut aturan yang sama dengan token antrian: cookie `httpOnly`, `sameSite=lax`, `secure` di production, tidak pernah di URL, `localStorage`, Context, atau log. Usulan implementasi: route handler same-origin yang menerima hasil login dan menyetel cookie, sejajar dengan `/api/session/start`. Nama cookie, pemisahan dari `access_token` antrian, dan TTL belum diputuskan.

### B.5 Profil dan NIK ([ADR-0011](../adr/0011-nik-linked-to-account.md))

- NIK adalah atribut akun, dibaca dari `GET /me` dalam bentuk tersamar, tampil hanya-baca di Detail Ticket. Tidak ada field NIK yang bisa diketik di alur booking.
- Satu NIK hanya boleh terhubung ke satu akun (ditegakkan BE). Batas 3 tiket per NIK per event ditegakkan BE, FE menampilkan lewat `canAddTicket` dengan `quota` dari server.
- Akun tanpa NIK valid diarahkan ke pelengkapan profil dan tidak bisa masuk Detail Ticket.
- Layar Detail Ticket yang ada sekarang sudah menampilkan NIK tersamar dan kuota dari mock (`booking.nik.*`, `booking.quota.exhausted`), tetapi sumbernya masih sesi booking dummy, bukan `GET /me`.

### B.6 Kontrak yang diminta dari BE

`sid` per login (satu aktif per akun), `SESSION_REVOKED` pada endpoint terproteksi, progres terikat akun, token slot antrian diterbitkan ulang saat login ulang, sesi WebView turunan sesi app, pembatasan laju login, `GET /me`, NIK unik lintas akun, `quota` pada sesi booking.

## C. Yang masih terbuka

| Pertanyaan | Dampak |
|---|---|
| **Register**: dibuat sendiri atau memakai SSO yang ada? ([overview §7](overview.md)) | Menentukan apakah ada rute `/register`, form, dan ADR baru. Belum ada keputusan |
| NIK diisi saat pendaftaran atau saat pertama kali booking? Boleh diubah setelah tersimpan? (ADR-0011) | Menentukan isi form register dan alur pelengkapan profil |
| Perlu refresh token? Bila ya, rotasinya harus mengikuti `sid` yang sama (ADR-0010) | Desain route cookie dan `/api/session/end` |
| Metode kredensial (email, nomor telepon, OTP) | Bentuk form dan kode error |
| Kebijakan gerbang login di `proxy.ts` (redirect ke `/login?returnTo=...`) | Perubahan matcher dan test E2E |
| Cakupan matcher untuk `/m/orders/*/pay` dan `/orders/*/ticket` | Celah akses sampai ditutup |

Dua keputusan ini sebaiknya jadi ADR baru ketika sudah disepakati (skill [`write-adr`](../ai/skills/write-adr/SKILL.md)): metode login/register dan kebijakan gerbang di edge.

## D. Test yang dijanjikan ADR dan belum ada

- Controller: `SESSION_REVOKED` pada queue, booking, payment menghasilkan layar sesi dicabut tanpa pemanggilan cancel.
- Playwright dua browser context: login di B mengeluarkan A, progres tetap terlihat di B. Saat ini ada `test.fixme` terkait di `expiry-and-guards.spec.ts`.
- Skenario MSW: `session-revoked`, `quota-exhausted`, `profile-incomplete`.
- Tidak ada NIK mentah di URL, query key, `localStorage`, Context, atau log.
