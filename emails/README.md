# Template email

Sumber MJML untuk email yang dikirim Email_Service di BE. Repo ini tidak mengirim email.

```bash
npm run emails:build
```

Hasilnya ada di `emails/dist/*.html` (tidak di-commit). Isi `<title>` tiap template dipakai sebagai subjek email.

## Placeholder

Format Mustache: `{{nama}}`, dan `{{#tickets}}...{{/tickets}}` untuk blok berulang. Semua template juga memakai `{{supportEmail}}`.

| Template | Kegunaan | Sumber | Placeholder |
|---|---|---|---|
| `verify-register` | Verifikasi email saat daftar | Req 1 AC7-8 | `customerName`, `verificationUrl` |
| `login-link` | Link masuk | Permintaan tim, belum ada di requirement | `customerName`, `loginUrl`, `expiryMinutes` |
| `booking-expired` | Booking kedaluwarsa | Req 7 AC2 | `bookingCode`, `eventName`, `eventUrl` |
| `ticket-issued` | E-tiket terbit | Req 7 AC1 | `eventName`, `eventDate`, `eventVenue`, `bookingCode`, `tickets[]`: `qrCodeUrl`, `category`, `seatNumber`, `attendeeNik` |

`qrCodeUrl` harus URL gambar yang bisa diakses publik, karena banyak klien email memblokir gambar `data:`.

BE sebaiknya mengisi `attendeeNik` dengan NIK tersamar, karena email bisa diteruskan.

Saat ini hanya Bahasa Indonesia. Versi Inggris boleh menyusul (Req 13 AC7).
