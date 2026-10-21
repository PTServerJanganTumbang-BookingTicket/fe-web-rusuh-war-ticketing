# ADR-0006: Payment via Midtrans Core API dengan UI sendiri

- **Status**: Proposed
- **Tanggal**: 2026-10-18
- **Pengambil keputusan**: Tim FE Web, disepakati dengan BE
- **Requirement terkait**: FR-20, FR-21, FR-24, FR-25, NFR-07, NFR-08

## Konteks

Klien menetapkan Midtrans sandbox. Metode di wireframe adalah Virtual Account, E-Wallet, dan Transfer Bank. Tidak ada kartu kredit. Payment page harus dipakai ulang di mobile lewat WebView dan mengikuti Signal DS.

## Opsi yang dipertimbangkan

1. **Snap (popup atau redirect bawaan Midtrans).** Paling cepat, tetapi tampilan tidak bisa mengikuti Signal DS, dan popup Snap di dalam WebView rawan masalah (redirect, deeplink, tombol back).
2. **Core API, UI dibangun sendiri.** Tampilan konsisten, kontrol penuh atas state pending dan expired. Tanpa kartu kredit, tidak ada beban PCI di FE.

## Keputusan

Opsi 2.

- **BE yang memanggil Midtrans.** FE hanya memanggil endpoint BE (mis. `POST /orders/{id}/payments`) dan menampilkan hasilnya.
- **Metode**: VA (`bank_transfer`, `echannel` untuk Mandiri) dan e-wallet (`qris`, `gopay`). "Transfer Bank" manual digabung ke VA (perlu konfirmasi klien).
- **`custom_expiry` diset sedikit lebih pendek dari TTL hold** (usulan: 9 menit) agar pembayaran tidak mungkin sukses setelah stok dilepas. Ini keputusan BE yang FE andalkan.
- **Halaman instruksi pembayaran**: nomor VA dengan tombol salin, atau QR, plus status pending yang diperbarui otomatis lewat polling (ADR-0004).

## Konsekuensi

- **Positif**: UX dan visual konsisten di web dan mobile. Semua state (pending, sukses, gagal, expired) di bawah kendali kita.
- **Negatif**: FE membangun UI instruksi untuk tiap metode. Dibatasi ke daftar metode di atas untuk menjaga scope.
- **Yang harus dijaga**: tidak ada server key atau client key Midtrans di FE. Steering AI melarang import SDK Midtrans di `apps/web` dan `packages/*`.

## Catatan implementasi (2026-10-19)

- Layar Payment saat ini berjalan di atas mock MSW. Pilihan metode memanggil `POST /orders/{id}/payment` dan status dipantau lewat `GET /orders/{id}` (polling dengan jitter, ADR-0004). FE tidak mengimpor atau memanggil Midtrans.
- Endpoint `POST /mock/orders/{id}/outcome` hanya ada di mock dan menggantikan notifikasi Midtrans ke BE untuk demo dan test. Tombol "Simulasikan berhasil/gagal" hanya dirender saat `NEXT_PUBLIC_API_MOCKING=enabled`.
- Bentuk `instruction` (`virtual_account`, `qr`, `bank_transfer`) adalah usulan FE dan perlu disepakati dengan BE.

