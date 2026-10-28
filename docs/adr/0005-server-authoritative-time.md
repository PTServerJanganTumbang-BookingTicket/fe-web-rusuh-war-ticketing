# ADR-0005: Countdown server-authoritative

- **Status**: Proposed
- **Tanggal**: 2026-10-18
- **Pengambil keputusan**: Tim FE Web, disepakati dengan BE
- **Requirement terkait**: FR-17, FR-18, FR-19, FR-21, FR-23, NFR-02

## Konteks

FR-19 mewajibkan timer booking server-authoritative dan konsisten saat refresh. Jam perangkat customer bisa salah beberapa menit, dan tab yang tidak aktif membuat `setInterval` melambat.

## Opsi yang dipertimbangkan

1. **Countdown dari durasi** (mis. `300` detik) yang dihitung mundur di klien. Rusak saat refresh dan saat jam perangkat salah.
2. **Countdown dari `expiresAt` absolut + offset jam server.** Konsisten lintas refresh dan perangkat.

## Keputusan

Opsi 2.

- **BE mengirim `expiresAt` (ISO 8601 UTC)** untuk sesi booking dan pembayaran, serta header `Date` atau endpoint `/time` untuk offset.
- **`core/time` menyediakan fungsi murni**: `computeServerOffset(serverNow, clientNow)` dan `remainingMs(expiresAt, clientNow, offset)`.
- **`useCountdown`** menghitung ulang dari jam sistem setiap tick (bukan mengurangi counter), sehingga tetap akurat setelah tab tidak aktif.
- **Saat sisa waktu mencapai nol, FE tidak memutuskan sendiri.** FE memanggil endpoint status. Transisi ke `bookingExpired` / `paymentExpired` mengikuti jawaban server.
- **Peringatan visual** pada sisa 60 detik, dan pengumuman ARIA live region untuk aksesibilitas.

## Konsekuensi

- **Positif**: tidak ada customer yang diputus lebih awal karena jam perangkat (mendukung prinsip "Jangan PHP"). Perilaku identik di web dan embed mobile.
- **Negatif**: BE perlu menyediakan `expiresAt` dan sumber waktu server di kontrak.
- **Yang harus dijaga**: unit test `core/time` dengan offset positif, negatif, dan tab yang tertidur. E2E Playwright dengan fake clock.

## Catatan implementasi (2026-10-19)

- Pada layar Detail Ticket, sisa waktu nol memicu satu pemanggilan ke server. FE **baru mengembalikan customer ke Waiting Room setelah server menjawab `ACCESS_EXPIRED`**, bukan saat timer menyentuh nol.
- Perilaku itu bisa diubah untuk pengujian lewat `NEXT_PUBLIC_BOOKING_EXPIRY`: `queue` (default, redirect ke `/events/[eventId]/queue`) atau `screen` (layar "Sesi booking berakhir" dengan tombol "Antre lagi"). Perlu restart dev server setelah mengubahnya.

## Catatan implementasi (2026-10-28)

- `remainingMs`, `serverOffsetMs`, `formatMmSs`, `withJitter` ada di `src/core/domain/time`.
- `useCountdown` membaca jam dari port `Clock` di container, sehingga test bisa memakai jam palsu lewat override registrasi. Mode `NEXT_PUBLIC_BOOKING_EXPIRY` dibaca sekali di `src/di/config.ts` dan sampai ke ViewModel sebagai `appConfig.bookingExpiry`.
