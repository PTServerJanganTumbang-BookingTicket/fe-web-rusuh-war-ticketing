# Template email

Sumber MJML untuk email yang dikirim Email_Service di BE. Repo ini tidak mengirim email.

```bash
npm run emails:build
```

Hasilnya ada di `emails/dist/*.html` (tidak di-commit). Isi `<title>` tiap template dipakai sebagai subjek email.

## Placeholder

Format Mustache: `{{nama}}`, dan `{{#tickets}}...{{/tickets}}` untuk blok berulang. Semua template juga memakai `{{supportEmail}}`, `{{logoUrl}}`, dan `{{appUrl}}` (header).

`logoUrl` adalah URL logo PNG yang bisa diakses publik (lebar 2x dari 160px, yaitu 320px, supaya tajam di layar retina). Klien email memblokir gambar `data:` dan SVG, jadi berkasnya perlu di-host di CDN atau di `public/` aplikasi ini. `appUrl` adalah origin aplikasi web (produksi: `https://www.rush-my-ticket.my.id`, tanpa garis miring di akhir). Gambar email dimuat dari `{{appUrl}}/images/email/` (folder `public/images/email`), jadi baru tampil setelah aplikasi di-deploy.

| Template | Kegunaan | Sumber | Placeholder |
|---|---|---|---|
| `verify-register` | Verifikasi email saat daftar (link 15 menit, sekali pakai, tujuan `/register/verified?token=`) | Req 1 AC7-8, kontrak `GET /auth/verify-email` | `customerName`, `verificationUrl` |
| `login-link` | Magic link | Kontrak §1.1 | `customerName`, `loginUrl`, `expiryMinutes` |
| `booking-expired` | Booking kedaluwarsa | Req 7 AC2 | `bookingCode`, `eventName`, `eventUrl` |
| `ticket-issued` | E-tiket terbit | Req 7 AC1 | `eventName`, `eventDate`, `eventVenue`, `bookingCode`, `tickets[]`: `ticketId`, `qrCodeUrl`, `category`, `nikMasked` |

Nomor kursi tidak dipakai: MoM 2026-10-28 memutuskan fitur itu tidak diimplementasikan, dan kontrak §6.2 tidak memuatnya, walaupun Req 7 AC1 masih menyebutnya.

`qrCodeUrl` harus URL gambar yang bisa diakses publik, karena banyak klien email memblokir gambar `data:`. Kontrak §6.2 mengembalikan `qr_code` sebagai `data:image/png;base64,...`, jadi BE perlu menyediakan URL tersendiri untuk email.

`nikMasked` memakai format tersamar yang sama dengan `holder.nik_masked` di kontrak, karena email bisa diteruskan.

Saat ini hanya Bahasa Indonesia. Versi Inggris boleh menyusul (Req 13 AC7).
