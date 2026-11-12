# Asumsi kontrak API dari FE

Asumsi yang tersisa di bawah. Profil akun (`GET /accounts/me`) dan ubah alias (`PATCH /accounts/me/saved-niks/{id}`) tidak lagi dipakai FE: halaman `/account` menampilkan email dan NIK tersamar dari sesi, dan alias hanya bisa ditambah atau dihapus. Test `api-conformance.test.ts` memastikan FE hanya memanggil endpoint yang ada di kontrak.

Kontrak terbaru ada di [`docs/api/api-contracts.md`](api-contracts.md) (v2.12.0, disalin dari repo `documentations`). `api-contract.md` di folder ini adalah ekspor lama dan tidak dipelihara.

Field di bawah dipakai FE tetapi **belum ada** di kontrak (`docs/api/api-contract.md`, `src/core/data/http/openapi.json`). Bentuknya asumsi FE, dibangun terhadap mock MSW (`src/mocks/api/auth.ts`). Setiap baris perlu disepakati dengan BE dan diusulkan ke repo [`documentations`](https://github.com/PTServerJanganTumbang-BookingTicket/documentations) sebelum dianggap final (ADR-0023 butir 1). Saat kontrak diperbarui, ikuti skill `sync-api-contract` dan hapus baris yang sudah masuk kontrak.

| Kebutuhan FE | Asumsi | Dipakai di | Bila BE belum menyediakan |
|---|---|---|---|
| NIK lengkap alias | `GET /accounts/me/saved-niks` menambah `nik` (16 digit) di setiap item, hanya untuk pemilik akun | `booking/data/holder-alias.schema.ts` | Pilihan alias di Detail Ticket tidak muncul; NIK diisi manual seperti sebelumnya |
| NIK lengkap pemesan | `user.nik` di `GET /auth/verify` berisi NIK lengkap 16 digit; FE menyimpannya di cookie profil httpOnly dan mengembalikannya lewat `/api/auth/session` (`nik`), tampilan tetap tersamar | `core/data/account/account-gateway.service.ts`, `booking` Detail Ticket | Pilihan 'NIK pemesan' di Detail Ticket tidak muncul |
| E-tiket untuk pemilik yang masuk | `GET /tickets/{ticket_id}/eticket` dengan Bearer (kontrak sudah menyebut Bearer atau `?t=`); FE web meneruskannya lewat `/api/account/tickets/{id}/eticket` karena token akun ada di cookie httpOnly | `ticket/data/http-ticket.service.ts` | — (sesuai kontrak) |

## Kenapa NIK lengkap, bukan id alias, di booking

`POST /bookings` dikirim langsung ke BE dengan grant token antrian, bukan lewat route same-origin, jadi BE tidak tahu akun pemiliknya dan tidak bisa memetakan `saved_nik_id` ke NIK. Karena itu FE mengisi `tickets[].nik` dengan NIK lengkap alias, dan kontrak `POST /bookings` tidak berubah. Konsekuensinya NIK lengkap alias ada di memori browser pemilik akun selama di Detail Ticket, sama seperti NIK yang diketik manual. Layar tetap menampilkan versi tersamar.

Alternatif yang perlu dibahas dengan BE bila NIK lengkap tidak boleh keluar dari server: `POST /bookings` menerima `saved_nik_id` dan dikirim dengan Bearer akun (lewat route same-origin). Dengan itu FE tidak bisa lagi mendeteksi NIK manual yang sama dengan alias sebelum submit; BE yang menolak (BR-02).
