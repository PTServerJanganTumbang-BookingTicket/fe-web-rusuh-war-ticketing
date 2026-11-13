# Asumsi kontrak API dari FE

Asumsi yang tersisa di bawah. Profil akun (`GET /accounts/me`) dan ubah alias (`PATCH /accounts/me/saved-niks/{id}`) tidak lagi dipakai FE: halaman `/account` menampilkan email dan NIK tersamar dari sesi, dan alias hanya bisa ditambah atau dihapus. Test `api-conformance.test.ts` memastikan FE hanya memanggil endpoint yang ada di kontrak.

Kontrak terbaru ada di [`docs/api/api-contracts.md`](api-contracts.md) (v2.12.0, disalin dari repo `documentations`). `api-contract.md` di folder ini adalah ekspor lama dan tidak dipelihara.

Field di bawah dipakai FE tetapi **belum ada** di kontrak (`docs/api/api-contract.md`, `src/core/data/http/openapi.json`). Bentuknya asumsi FE, dibangun terhadap mock MSW (`src/mocks/api/auth.ts`). Setiap baris perlu disepakati dengan BE dan diusulkan ke repo [`documentations`](https://github.com/PTServerJanganTumbang-BookingTicket/documentations) sebelum dianggap final (ADR-0023 butir 1). Saat kontrak diperbarui, ikuti skill `sync-api-contract` dan hapus baris yang sudah masuk kontrak.

| Kebutuhan FE | Asumsi | Dipakai di | Bila BE belum menyediakan |
|---|---|---|---|
| `Authorization: Bearer` di endpoint ber-grant (§4, §5) untuk customer login | Kontrak §4 menuntutnya bila grant milik akun login, dan kursi `saved_nik_id` / `use_account_nik` di `POST /bookings` hanya berlaku bagi akun yang terbukti. Token akun ada di cookie httpOnly, jadi FE belum bisa mengirimnya dari browser; butuh route same-origin yang meneruskan `GET /events/{id}/tickets` dan `POST /bookings` dengan Bearer (seperti `/api/account/*`). Sampai itu ada, `account` di respons tiket kosong dan NIK pemesan diambil dari sesi akun FE (`/api/auth/session`) | `booking/data/http-booking.service.ts`, mock `src/mocks/api/booking.ts` | Dengan BE sungguhan, kursi `saved_nik_id` / `use_account_nik` ditolak `400` (grant tamu) atau `401 UNAUTHENTICATED`; NIK diketik tetap bekerja. Mock menerima kedua bentuk tanpa bukti akun |
| E-tiket untuk pemilik yang masuk | `GET /tickets/{ticket_id}/eticket` dengan Bearer (kontrak sudah menyebut Bearer atau `?t=`); FE web meneruskannya lewat `/api/account/tickets/{id}/eticket` karena token akun ada di cookie httpOnly | `ticket/data/http-ticket.service.ts` | — (sesuai kontrak) |

## Kursi booking tidak membawa NIK lengkap

API tidak pernah mengirim NIK lengkap (FR-32c, NFR-11): `GET /accounts/me/saved-niks` dan `account` di `GET /events/{event_id}/tickets` hanya membawa `nik_masked`. Karena itu FE tidak memegang NIK lengkap pemegang tiket dari profil. Per kursi `POST /bookings` membawa tepat satu dari `nik` (diketik), `saved_nik_id` (id entri Daftar NIK) atau `use_account_nik: true` (NIK terdaftar customer, paling banyak satu kursi), dan ketiganya dikenali FE lewat id. BR-02 di klien membandingkan NIK diketik berdasarkan nilainya dan pilihan profil berdasarkan id; dua pilihan profil yang ternyata NIK yang sama (mis. entri Daftar NIK yang sama dengan NIK akun) hanya bisa ditolak server (`400 VALIDATION_ERROR`, dibandingkan lewat hash NIK). Pemegang dari profil tidak dikirim ke `POST /nik/validate`.
