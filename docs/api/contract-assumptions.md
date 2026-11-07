# Asumsi kontrak API dari FE

Endpoint dan field di bawah dipakai FE tetapi **belum ada** di kontrak (`docs/api/api-contract.md`, `src/core/data/http/openapi.json`). Bentuknya asumsi FE, dibangun terhadap mock MSW (`src/mocks/api/auth.ts`). Setiap baris perlu disepakati dengan BE dan diusulkan ke repo [`documentations`](https://github.com/PTServerJanganTumbang-BookingTicket/documentations) sebelum dianggap final (ADR-0023 butir 1). Saat kontrak diperbarui, ikuti skill `sync-api-contract` dan hapus baris yang sudah masuk kontrak.

| Kebutuhan FE | Asumsi | Dipakai di | Bila BE belum menyediakan |
|---|---|---|---|
| Profil akun | `GET /accounts/me` (Bearer) → `data: { id, name, email, nik_masked, created_at }` | `auth/data/http-profile.service.ts`, route same-origin `/api/account/profile` | Halaman `/account` tetap tampil dengan email dan NIK tersamar dari sesi; nama dan tanggal bergabung tidak muncul |
| Ubah alias | `PATCH /accounts/me/saved-niks/{id}` (Bearer), body `{ label, nik? }`. `nik` hanya dikirim bila diganti dan dicek ulang Dukcapil. 200 bila berhasil; 400 NIK tidak valid atau nonaktif; 404 alias tidak ada; 409 NIK sudah tersimpan di alias lain | `auth/data/http-saved-nik.service.ts`, `/api/account/saved-niks/{id}` | Simpan perubahan gagal dengan pesan galat umum; tambah dan hapus tetap jalan |
| Nama lengkap alias | `POST /accounts/me/saved-niks` dan `PATCH /accounts/me/saved-niks/{id}` menerima `name` (nama sesuai KTP, maks. 100 karakter) di samping `label` (nama panggilan). `GET /accounts/me/saved-niks` mengembalikan `name` di setiap item | `auth/data/http-saved-nik.service.ts`, `auth/data/account.schema.ts`, `booking/data/holder-alias.schema.ts` | Form alias tetap meminta nama lengkap; BE yang belum mengenal `name` mengabaikannya, dan daftar alias serta pilihan pemegang tiket hanya menampilkan nama panggilan |
| NIK lengkap alias | `GET /accounts/me/saved-niks` menambah `nik` (16 digit) di setiap item, hanya untuk pemilik akun | `booking/data/holder-alias.schema.ts` | Pilihan alias di Detail Ticket tidak muncul; NIK diisi manual seperti sebelumnya |
| E-tiket untuk pemilik yang masuk | `GET /tickets/{ticket_id}/eticket` dengan Bearer (kontrak sudah menyebut Bearer atau `?t=`); FE web meneruskannya lewat `/api/account/tickets/{id}/eticket` karena token akun ada di cookie httpOnly | `ticket/data/http-ticket.service.ts` | — (sesuai kontrak) |

## Kenapa NIK lengkap, bukan id alias, di booking

`POST /bookings` dikirim langsung ke BE dengan grant token antrian, bukan lewat route same-origin, jadi BE tidak tahu akun pemiliknya dan tidak bisa memetakan `saved_nik_id` ke NIK. Karena itu FE mengisi `tickets[].nik` dengan NIK lengkap alias, dan kontrak `POST /bookings` tidak berubah. Konsekuensinya NIK lengkap alias ada di memori browser pemilik akun selama di Detail Ticket, sama seperti NIK yang diketik manual. Layar tetap menampilkan versi tersamar.

Alternatif yang perlu dibahas dengan BE bila NIK lengkap tidak boleh keluar dari server: `POST /bookings` menerima `saved_nik_id` dan dikirim dengan Bearer akun (lewat route same-origin). Dengan itu FE tidak bisa lagi mendeteksi NIK manual yang sama dengan alias sebelum submit; BE yang menolak (BR-02).
