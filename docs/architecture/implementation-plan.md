# Rencana Implementasi: Model, Use Case, dan ViewModel untuk Semua Layar

Status: **Draft, 22 Oktober 2026**. Bergantung pada [ADR-0017](../adr/0017-screen-model-and-contract-mapping.md) (Proposed).

Dokumen ini merencanakan dua pekerjaan: merapikan layar yang sudah ada agar mudah dibaca, dan melengkapi semua alur yang belum ada. Strukturnya dibuat supaya perubahan kontrak BE cukup diserap di satu tempat.

## 1. Masalah saat ini

| Masalah | Contoh | Akibat |
|---|---|---|
| ViewModel mencampur wiring hook, keputusan state, dan pembentukan props View | `useBookingViewModel` punya empat cabang `if` yang langsung menghasilkan `StatusViewProps` berisi string i18n | State layar tidak terlihat dari VM. Test VM memeriksa string, bukan state |
| Home memuat data dan memetakan props di dalam satu fungsi `use cache` | `loadHomeProps` di `HomeContainer.tsx` | Loader, cache, dan presentasi sulit dipisah dan dites |
| Tipe domain di `core` identik dengan bentuk JSON BE | Schema zod di `api/adapters/booking.ts` langsung mengembalikan `BookingSession` | Perubahan nama field BE merembet ke `core`, mapper, dan test |
| Bentuk return VM berbeda-beda | Queue mengembalikan `QueueViewProps`, Booking dan Payment mengembalikan `{ kind, view }` | Tiap layar dibaca dengan cara berbeda |
| Use case belum konsisten | `emulatePaymentOutcome` dipanggil langsung dari `usePaymentViewModel`, bukan lewat `application` | Tidak jelas kapan command harus menjadi use case |
| Alur belum lengkap | Login dan E-tiket placeholder; submit booking dummy (`/orders/RB-00912/pay`); join queue, `SESSION_REVOKED`, `/api/session/exchange`, `PaymentResultNotifier` belum ada; dua E2E `test.fixme` | Belum ada alur ujung ke ujung |

## 2. Struktur target

```
packages/core/src/
├─ domain/<x>.ts                  Model domain milik FE (bukan bentuk JSON BE)
├─ <x>/machine.ts                 State machine alur yang punya aturan (booking, payment), reducer murni
└─ application/<useCase>.ts       Command dengan aturan atau langkah; port di application/ports.ts

packages/api/src/
├─ contracts/<resource>.ts        Schema zod DTO, cermin OpenAPI. Diganti hasil generate saat kontrak final
├─ mappers/<resource>.ts          DTO → domain (dan domain → request body). Satu-satunya yang tahu nama field BE
├─ adapters/<resource>.ts         apiFetch + contract + mapper; memenuhi port di core
├─ http/client.ts                 Tetap satu pintu HTTP
└─ queries.ts, queryKeys.ts       Query options (baca)

apps/web/features/<feature>/
├─ <screen>Model.ts               type <Screen>ScreenState (union) + derive<Screen>ScreenState(input): murni, tanpa i18n
├─ use<Screen>ViewModel.ts        Hanya hook: query, mutation, countdown, router → { state, actions }
├─ to<Screen>ViewProps.ts         (state, actions) → props View: i18n, format, state tombol
├─ <Screen>Container.tsx          const vm = use<Screen>ViewModel(); render View dari to<Screen>ViewProps(vm)
└─ __tests__/                     test derive (murni), mapper (murni), ViewModel (Testing Library + MSW)
```

Pertanyaan yang dijawab tiap file:

| File | Menjawab |
|---|---|
| `<screen>Model.ts` | Layar ini bisa dalam kondisi apa saja, dan dari data apa kondisi itu diturunkan? |
| `use<Screen>ViewModel.ts` | Data dan command apa yang dipakai, dan kapan navigasi terjadi? |
| `to<Screen>ViewProps.ts` | Bagaimana kondisi itu ditampilkan? |
| `core/application/*` | Aturan apa yang berlaku sebelum memanggil BE? |
| `api/mappers/*` | Field BE mana yang menjadi field domain mana? |

Contoh state layar Booking:

```ts
export type BookingScreenState =
  | { kind: "loading" }
  | { kind: "failed"; error: AppError }
  | { kind: "expired"; next: "redirect" | "screen" }
  | { kind: "selecting"; session: BookingSession; selection: Selection; remainingMs: number }
  | { kind: "submitting"; session: BookingSession; selection: Selection; remainingMs: number }
  | { kind: "stockChanged"; session: BookingSession; adjusted: Selection; remainingMs: number };
```

Pengecualian Home tetap berlaku (ADR-0003, ADR-0007): tanpa hook ViewModel. Polanya `loadHome()` (cache, mengembalikan domain + status error) lalu `toHomeViewProps()`.

## 3. Daftar alur

Endpoint ditulis sebagai **asumsi** sampai kontrak BE final. Status tiap endpoint dilacak di bagian 6.

| # | Alur | Use case (`core/application`) | Port / endpoint | Error dan kondisi tepi |
|---|---|---|---|---|
| F1 | Home → pilih event | (baca) | `GET /events` | BE down: Home statis tetap tampil dengan pesan |
| F2 | Login lalu kembali ke tujuan | `login`, `resolveReturnTo` (murni, hanya path same-origin) | `POST /auth/login`, `GET /me` | Kredensial salah, rate limit |
| F3 | Akun tanpa NIK valid | `ensureBookingEligible` | `GET /me` | `NIK_INVALID` → layar lengkapi profil (ADR-0011) |
| F4 | Masuk antrian atau melanjutkan slot | `joinQueue` (idempoten, slot lama dipakai lagi, ADR-0010) | `POST /events/:id/queue` | Event tidak on sale, belum login |
| F5 | Waiting room → giliran tiba | `enterBookingRoom` (ada) | `GET /events/:id/queue`, `/api/session/start` | `QUEUE_TOKEN_INVALID`, `SLOT_TAKEN_OVER` |
| F6 | Pilih tiket | `addTicket`, `removeTicket` (ada) | `GET /events/:id/booking-session` | Kuota habis, stok 0 |
| F7 | Submit booking | `createBooking` + `core/booking/machine.ts` + `reconcileSelection` | `POST /events/:id/bookings` → `orderId` | `STOCK_INSUFFICIENT` → popup stok terbaru; `QUOTA_EXCEEDED` inline; `ACCESS_EXPIRED` → antrian |
| F8 | Sudah punya booking aktif | `resumeBooking` | `activeOrderId` di sesi booking atau `/me` | Langsung ke Payment (prinsip "jangan PHP") |
| F9 | Pembayaran | `payOrder` (ada), `simulatePaymentOutcome` (mock, lewat `application`) | `POST /orders/:id/payment`, polling `GET /orders/:id` | `PAYMENT_EXPIRED`, gagal, pending lama |
| F10 | Hasil pembayaran | `notifyPaymentResult` | Port `PaymentResultNotifier` (web: router; WebView: postMessage atau custom scheme, ADR-0008) | — |
| F11 | WebView masuk | `exchangeSession` | `/api/session/exchange` (route baru) | Code kedaluwarsa atau dipakai ulang |
| F12 | E-tiket | (baca) | `GET /orders/:id/ticket` | Order belum lunas → kembali ke Payment |
| F13 | Sesi dicabut | — (pemetaan di `api`, penanganan di `AppProviders`) | 401 `SESSION_REVOKED` di semua endpoint terproteksi | Layar "akun dipakai di perangkat lain" → login (ADR-0010) |
| F14 | Logout | `logout` | `POST /auth/logout` | — |
| F15 | Maintenance, 404, error global | — | 503 + `Retry-After` | `/maintenance`, `not-found.tsx`, `error.tsx` |

Error code yang perlu ditambahkan ke `core/errors` setelah dikonfirmasi BE: `SESSION_REVOKED`, `UNAUTHENTICATED`, `EVENT_NOT_ON_SALE`, `ORDER_NOT_FOUND`, `MAINTENANCE`.

## 4. Inventaris per layar

| Layar | Route | Sekarang | Target |
|---|---|---|---|
| Home | `/` | Container async + `toEventCardProps` | `loadHome` + `toHomeViewProps`; CTA mengarah ke login bila belum masuk (lewat `proxy.ts`, Home tetap statis) |
| Login | `/login` | Placeholder | `loginModel`, `useLoginViewModel`, `LoginView`; use case `login`, `resolveReturnTo` |
| Lengkapi profil | `/profile/nik` (usulan) | Tidak ada | Menunggu keputusan F3 |
| Waiting Room | `/events/[eventId]/queue` | VM mengembalikan props View | `queueModel` (`joining`, `waiting`, `admitted`, `entering`, `takenOver`, `failed`); use case `joinQueue` |
| Detail Ticket | `/events/[eventId]/book` | VM dengan submit dummy | `bookingModel` + `core/booking/machine.ts`; use case `createBooking`, `resumeBooking` |
| Payment | `/orders/[orderId]/pay`, `/m/...` | VM memanggil `emulatePaymentOutcome` langsung | `paymentModel`; notifier per platform; semua command lewat `application` |
| E-tiket | `/orders/[orderId]/ticket` | Placeholder | `ticketModel`, `useTicketViewModel`, `TicketView` |
| Global | `/maintenance`, 404, error | Tidak ada | View statis + key i18n |

## 5. Tahapan PR

Satu concern per PR, sesuai konvensi Git.

| # | PR | Isi | Selesai bila |
|---|---|---|---|
| 1 | `docs(adr): ADR-0017` | ADR ini dan rencana ini; `docs/architecture/contracts.md` (bagian 6) | ADR disepakati tim (Accepted). Saat itu steering `architecture-rules.md`, `coding-conventions.md`, dan skill `new-feature-screen` diperbarui |
| 2 | `refactor(api): contracts dan mappers` | Pecah lima adapter jadi `contracts/` + `mappers/` + `adapters/`; tambah zona `contracts ← mappers ← adapters` di `packages/config/eslint/layers.mjs`; handler MSW memakai tipe `z.input` dari contract | Perilaku sama, test lama hijau, tiap mapper punya test fixture |
| 3 | `refactor(web): screen model untuk layar yang ada` | Queue, Booking, Payment ke pola `<screen>Model` + `{ state, actions }`; Home ke `loadHome` + `toHomeViewProps`; lint melarang `@rusuh/i18n` di ViewModel | Test derive dan mapper murni; test VM memeriksa `state.kind`; E2E yang ada tetap hijau |
| 4 | `feat(auth)` | F2, F13, F14 **selesai (2026-10-23)**: login passwordless (link email), `/auth/callback`, `/me`, `returnTo`, 401 global ke login, logout. F3 **selesai (2026-10-23)**: registrasi email + NIK, dialog review, galat Dukcapil/email terdaftar, verifikasi email, kirim ulang (`/register?step=resend`). **Sisa**: E2E login dan registrasi. Gerbang login dijaga BE (401) lewat redirect di `AppProviders`, bukan `proxy.ts`, karena cookie sesi milik domain BE | Test use case + VM; E2E login → antrian |
| 5 | `feat(queue)` | F4, F5: `joinQueue`, slot diambil alih | E2E `fixme` "slot diambil alih" aktif dan hijau |
| 6 | `feat(booking)` | F7, F8: `machine.ts`, `createBooking`, `reconcileSelection`, popup stok, kuota, resume | E2E `fixme` "stok habis saat submit" aktif dan hijau |
| 7 | `feat(payment)` | F9–F11: port `PaymentResultNotifier`, `/api/session/exchange`, layout embed, `emulatePaymentOutcome` masuk `application` | Test notifier web dan WebView; uji manual WebView dijadwalkan (ADR-0008) |
| 8 | `feat(ticket)` + `feat(web): layar global` | F12, F15 | E2E happy path berakhir di E-tiket |

PR 4, 7, dan 8 tidak menyentuh file yang sama, jadi bisa dikerjakan paralel setelah PR 3.

## 6. Siap saat kontrak BE final

- Buat `docs/architecture/contracts.md`: satu baris per endpoint dengan kolom method dan path, status (`asumsi`, `mock`, `final`), pemilik di BE, file contract, dan file mapper.
- Setiap asumsi kontrak di kode diberi komentar `// KONTRAK-ASUMSI: <METHOD path>` supaya bisa di-grep dan dicocokkan dengan tabel di atas.
- Saat OpenAPI tiba: generate ke `packages/api/generated/` (ADR-0009), lalu ganti isi `contracts/*.ts` dengan schema hasil generate. Error typecheck hanya muncul di `mappers/`, dan hanya itu yang diperbaiki. Domain, use case, ViewModel, dan View tidak berubah kecuali semantiknya berubah.
- Test mapper memakai fixture JSON dari BE dan berfungsi sebagai contract test. Bila BE mengubah response, test ini yang gagal lebih dulu, bukan E2E.
- Skill `sync-api-contract` diperbarui mengikuti alur ini.

## 7. Pertanyaan terbuka

| Pertanyaan | Memblokir | Ditanyakan ke |
|---|---|---|
| Login memakai email + password, OTP, atau SSO? Figma mengusulkan passwordless (magic link email) + verifikasi email terpisah; perlu dikonfirmasi | F2 | Klien, BE |
| NIK diisi saat daftar atau saat booking pertama? Boleh diubah? Figma: diisi saat daftar dan diverifikasi Dukcapil (lihat 7.1 no. 1) | F3 | Klien (ADR-0011) |
| Bentuk request dan response submit booking; apakah langsung membuat order? | F7, F8 | BE |
| Join queue eksplisit (`POST`) atau implisit saat `GET` pertama? | F4 | BE |
| Format dan isi e-tiket (QR, kode, PDF)? | F12 | Klien, BE |
| Endpoint server time terpisah atau cukup `serverNow` di tiap response? | Semua timer | BE (ADR-0005) |

### 7.1 Temuan dari Figma "SJT ZAKI" (dipindai 2026-10-22)

Sumber: [Figma SJT ZAKI](https://www.figma.com/design/QFBQE3rvXBqieg8zfJoRaU/SJT-ZAKI?node-id=1-1890), frame Login, Registration, Confirmation & Success, Error & Fallback States, Email Templates, Design System, dan mockup booking (Component 1). Dipindai sebagai tamu, jadi komentar Figma belum diperiksa.

**Konflik dengan keputusan repo**

| # | Pertanyaan | Isi Figma | Bertentangan dengan | Memblokir | Ditanyakan ke |
|---|---|---|---|---|---|
| 1 | Aturan NIK mana yang berlaku? | Registration: NIK diisi sekali saat daftar, diverifikasi Dukcapil. Mockup booking: field "NIK Tiket 1 / NIK Tiket 2", "Maks. 3 tiket per pesanan. Satu NIK untuk setiap tiket." | ADR-0011: NIK dari akun, hanya-baca dan tersamar, batas 3 tiket per NIK per event | F3, F6, F7 | Klien, BE, desainer |
| 2 | Sistem visual mana yang dipakai? | Brand ungu "rusuh" dengan token sendiri dan Poppins | ADR-0012: token dan primitif Telkomsel Signal DS | Semua layar | Klien, desainer |
| 3 | Bahasa UI? | Frame auth berbahasa Inggris, mockup booking berbahasa Indonesia | `product.md`: UI dalam Bahasa Indonesia | F2, F3, F15 | Klien, desainer |
| 4 | Apakah booking yang tertunda tetap ada setelah sesi login habis? | Layar "Session expired" menyatakan konteks booking tetap tersimpan; login ulang tidak memperpanjang waktu reservasi | ADR-0010 masih Proposed, menunggu konfirmasi klien | F13 | Klien, BE |

**Ditandai belum final di Figma**

| # | Pertanyaan | Isi Figma | Memblokir | Ditanyakan ke |
|---|---|---|---|---|
| 5 | Token "auth-only" disetujui? | `--auth-color-body`, `--auth-control-border`, `--auth-color-warning`, `--auth-color-info`, `--auth-primary-hover` berstatus *proposed*, "still require product review" | F2, F3 | Product, desainer |
| 6 | Breakpoint auth dipakai? | Usulan: mobile < 768px, tablet 768–1023px, desktop ≥ 1024px; hanya untuk layar auth, bukan retrofit layar lama | F2, F3 | Desainer |
| 7 | Boleh menampilkan "Email already registered"? | Policy-gated: bisa membocorkan keberadaan akun. Tanpa izin BE, tampilkan respons generik "cek inbox" | F2, F3 | BE, security |
| 8 | Berapa masa berlaku link login/verifikasi dan cooldown kirim ulang? | "Configurable backend policy"; `{{expires_in}}` di template email adalah placeholder | F2, F3 | BE |
| 9 | Berapa batas rate limit? | Countdown 00:28 hanya contoh; nilai diambil dari `Retry-After` | F2, F15 | BE |
| 10 | URL pusat bantuan untuk "Contact Support" dan `{{help_center_url}}`? | Disebut implementation-configurable | F15 | Klien |

**Dampak ke rencana bila Figma disetujui**

- Error code baru di `core/errors` (bagian 3): email sudah terdaftar, verifikasi NIK tidak tersedia (Dukcapil timeout), NIK tidak cocok, link login/verifikasi tidak valid atau sudah dipakai, rate limit (429 + `Retry-After`), service unavailable (503), sesi kedaluwarsa.
- Alur auth bertambah: route penukaran magic link, layar "cek inbox", kirim ulang dengan cooldown, verifikasi email, dan review data sebelum registrasi.
- Home punya filter "Segera habis", yang berarti status event keempat di luar `upcoming | on_sale | sold_out`.
- Sudah selaras: timer booking ±5 menit, timer pembayaran 10 menit, metode VA / e-wallet / transfer bank, langkah "Pilih tiket → Pembayaran → Selesai", layar pembayaran habis waktu, posisi dan estimasi di Waiting Room.
