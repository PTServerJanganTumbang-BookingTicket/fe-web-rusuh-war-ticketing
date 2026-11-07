# Konteks Produk

Rusuh Booking Tiket: penjualan tiket konser online yang tahan flash crowd. Sumber requirement: dokumen tender "Evaluasi Expertise Solution Development 2026 H2" dan pembaruannya di repo [`documentations`](https://github.com/PTServerJanganTumbang-BookingTicket/documentations), termasuk kontrak API.

## Halaman

| Halaman | Inti |
|---|---|
| Home | Daftar event, available (aktif) vs sold out (disabled) |
| Waiting Room | Posisi antrian, update otomatis, auto-redirect saat giliran tiba |
| Detail Ticket | NIK per tiket (terisi dari akun bila login, diisi manual bila tamu), kategori dan harga, maks 3 tiket per transaksi dan 1 NIK per tiket (ditegakkan BE), countdown booking |
| Payment | Countdown 10 menit, VA dan e-wallet via BE (Midtrans), dipakai ulang di mobile WebView |

## Prinsip yang tidak boleh dilanggar

1. **Jaga UX apa pun kondisi backend.** Setiap error punya layar atau pesan yang jelas. Tidak ada layar kosong, spinner tanpa akhir, atau pesan error mentah.
2. **Jangan PHP.** Customer yang sudah dapat slot atau sudah booking tidak boleh diputus oleh FE. FE tidak pernah membatalkan sesi atas inisiatif sendiri; FE selalu mengikuti status dari server.

## Keputusan klien yang sudah pasti

- Login bersifat opsional, dikonfirmasi CEO. Customer bisa antre dan membeli sebagai tamu. E-tiket dikirim ke email akun atau email yang diinput.
- Login tanpa kata sandi lewat magic link (kontrak API §1, [ADR-0023](../../adr/0023-passwordless-login-email.md)).
- BR-01: maksimal 3 tiket per transaksi. BR-02: 1 NIK untuk 1 tiket per event. BR-07: satu keterlibatan aktif per event, hanya untuk customer login.
- Usulan tim, menunggu konfirmasi: satu sesi login aktif per akun ([ADR-0010](../../adr/0010-login-single-session-progress-persistence.md)). NIK terdaftar terikat ke akun ([ADR-0011](../../adr/0011-nik-linked-to-account.md)).
- Payment gateway: Midtrans sandbox.
- Stok habis saat submit: tampilkan **popup** dengan stok terbaru.
- Stack: Next.js, Telkomsel Signal Design System, Tailwind CSS.

## Bahasa

UI dalam Bahasa Indonesia lewat `src/core/i18n`. Tidak ada string UI yang di-hardcode di komponen. Bahasa Indonesia adalah bawaan; Inggris tersedia lewat tombol ID/EN di navbar (pilihan disimpan di perangkat) dan saat ini mencakup Detail Ticket, profil, e-tiket, Tiket saya, dialog, serta navbar dan footer. Key yang belum diterjemahkan tampil dalam Bahasa Indonesia. Key baru di `id.messages.ts` untuk layar itu wajib punya padanan di `en.messages.ts` (dicek test).
