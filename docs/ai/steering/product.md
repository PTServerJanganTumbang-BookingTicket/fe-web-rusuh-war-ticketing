# Konteks Produk

Rusuh Booking Tiket: penjualan tiket konser online yang tahan flash crowd. Sumber requirement: dokumen tender "Evaluasi Expertise Solution Development 2026 H2".

## Halaman

| Halaman | Inti |
|---|---|
| Home | Daftar event, available (aktif) vs sold out (disabled) |
| Waiting Room | Posisi antrian, update otomatis, auto-redirect saat giliran tiba |
| Detail Ticket | NIK terisi otomatis dari akun (hanya-baca, tersamar), kategori dan harga, maks 3 tiket per NIK per event (ditegakkan BE), countdown booking |
| Payment | Countdown 10 menit, VA dan e-wallet via BE (Midtrans), dipakai ulang di mobile WebView |

## Prinsip yang tidak boleh dilanggar

1. **Jaga UX apa pun kondisi backend.** Setiap error punya layar atau pesan yang jelas. Tidak ada layar kosong, spinner tanpa akhir, atau pesan error mentah.
2. **Jangan PHP.** Customer yang sudah dapat slot atau sudah booking tidak boleh diputus oleh FE. FE tidak pernah membatalkan sesi atas inisiatif sendiri; FE selalu mengikuti status dari server.

## Keputusan klien yang sudah pasti

- Login wajib sebelum antre. Email e-tiket diambil dari akun.
- Usulan tim, menunggu konfirmasi klien: satu sesi login aktif per akun dengan progres tetap tersimpan ([ADR-0010](../../adr/0010-login-single-session-progress-persistence.md)), dan NIK terikat ke akun ([ADR-0011](../../adr/0011-nik-linked-to-account.md)).
- Payment gateway: Midtrans sandbox.
- Stok habis saat submit: tampilkan **popup** dengan stok terbaru.
- Stack: Next.js, Telkomsel Signal Design System, Tailwind CSS.

## Bahasa

UI dalam Bahasa Indonesia lewat `src/ui/i18n`. Tidak ada string UI yang di-hardcode di komponen.
