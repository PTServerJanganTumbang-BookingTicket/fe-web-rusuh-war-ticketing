# ADR-0010: Login satu sesi aktif dengan progres yang melekat pada akun

- **Status**: Proposed
- **Tanggal**: 2026-10-19
- **Pengambil keputusan**: Tim FE Web dan BE, perlu dikonfirmasi klien
- **Requirement terkait**: Login wajib sebelum antre (jawaban klien), FR-06–10 (antrian), FR-11–19 (booking), FR-20–25 (pembayaran), prinsip produk "Jangan PHP", [ADR-0004](0004-server-state-tanstack-query.md), [ADR-0005](0005-server-authoritative-time.md), [ADR-0008](0008-webview-payment-embed.md), [ADR-0009](0009-contract-first-openapi-msw.md)

## Konteks

Login wajib sebelum masuk antrian. Customer bisa berpindah perangkat di tengah proses (ponsel mati, pindah ke laptop, membuka dari app mobile lalu web). Dua hal harus pasti:

1. **Satu akun hanya boleh punya satu sesi login aktif.** Login di tempat lain mengeluarkan sesi yang lama.
2. **Pengeluaran sesi tidak boleh membuang progres customer.** Posisi antrian, sesi booking, dan pembayaran yang sedang berjalan harus tetap ada dan bisa dilanjutkan dari perangkat baru. Ini turunan langsung prinsip "Jangan PHP": FE tidak pernah memutus customer yang sudah punya slot.

Batasan: FE tidak boleh menyimpan progres di sisi klien (ADR-0004), dan FE tidak memutuskan kedaluwarsa sendiri (ADR-0005). Edge `proxy.ts` hanya bisa memverifikasi tanda tangan token, bukan status pencabutan (ADR-0007).

## Opsi yang dipertimbangkan

### Soal konkurensi login

1. **Sesi bebas banyak (tanpa batas).** Paling sederhana. Melanggar kebutuhan satu sesi aktif, dan membuka celah satu akun dipakai beberapa orang untuk menguasai slot.
2. **Login pertama menang (login baru ditolak selama sesi lama aktif).** Aman dari pengambilalihan, tetapi customer yang kehilangan perangkat terkunci sampai sesi lama habis. Buruk saat TTL booking berjalan.
3. **Login terakhir menang (login baru mencabut sesi lama).** Customer selalu bisa masuk dari perangkat yang sedang dipegang. Perangkat lama perlu diberi tahu dengan jelas.

### Soal tempat progres disimpan

A. **Progres terikat sesi login.** Mencabut sesi berarti progres hilang. Bertentangan dengan "Jangan PHP".

B. **Progres terikat akun di server (kunci `userId` + `eventId`).** Sesi hanya kredensial untuk mengakses progres. Sesi baru langsung melihat progres yang sama.

## Keputusan

**Opsi 3 (login terakhir menang) dengan progres terikat akun (B).**

### Model

- BE menerbitkan **`sid`** (session id) pada setiap login, ada di access token. Satu akun hanya punya satu `sid` aktif. Login baru dari klien mana pun mencabut `sid` sebelumnya: login di app mobile mengeluarkan sesi web, dan sebaliknya.
- **Antrian, sesi booking, dan order disimpan di server dengan kunci akun**, bukan `sid`. Pencabutan `sid` tidak menyentuhnya. Access token yang baru diterbitkan untuk slot yang sama.
- **Sesi WebView (ADR-0008) diturunkan dari sesi app yang sedang aktif**, bukan login baru. Menukar one-time code tidak boleh mencabut sesi app. BE perlu menegaskan ini di kontrak.

### Alur pindah perangkat

```
Perangkat A (antrian posisi 40)          BE                    Perangkat B
        │ polling posisi ───────────────► │
        │                                 │ ◄──── login ─────────── │
        │                                 │  cabut sid A, buat sid B│
        │                                 │  antrian akun tetap     │
        │ ◄──── 401 SESSION_REVOKED ───── │                         │
        │ tampil "akun dipakai di         │ ◄── GET posisi (sid B) ─│
        │ perangkat lain" (progres aman)  │ ──── posisi 38 ───────► │
```

### Perilaku FE

1. **Kode error baru `SESSION_REVOKED`** (HTTP 401) ditambahkan ke katalog ADR-0009: token valid secara tanda tangan, tetapi `sid`-nya sudah dicabut oleh login lain. Dibedakan dari `ACCESS_EXPIRED` (TTL booking habis), `QUEUE_TOKEN_INVALID` (token antrian), dan `SLOT_TAKEN_OVER` (slot booking diambil tab lain pada sesi yang sama).
2. **Satu penanganan global.** Semua query dan mutation yang menerima `SESSION_REVOKED` memicu: hapus cookie lewat route `/api/session/end`, hentikan polling, tampilkan layar "Akunmu dipakai di perangkat lain". Layar itu menyatakan eksplisit bahwa antrian, booking, dan pembayaran **tetap tersimpan**, dengan tombol "Masuk lagi di perangkat ini".
3. **FE tidak membatalkan apa pun** saat sesi dicabut. Tidak ada pemanggilan cancel, tidak ada reset state lokal yang berarti kehilangan slot.
4. **Login mengingat tujuan** (`returnTo`: queue, book, atau pay). Setelah login, FE mengarahkan ke tujuan itu, dan layar mengikuti status dari server (posisi antrian, sisa waktu dari `expiresAt`, status order). Tidak ada progres yang dibangun ulang di klien.
5. **Peringatan sebelum login.** Halaman login menyebut bahwa masuk di perangkat ini akan mengeluarkan perangkat lain, dan bahwa progres tetap aman.
6. **Beberapa tab pada perangkat yang sama berbagi satu cookie**, jadi bukan pengambilalihan. Pengambilalihan slot antar tab tetap ditangani `SLOT_TAKEN_OVER` (ADR-0009).
7. **Deteksi lewat polling yang sudah ada** (antrian, status booking, status payment). Keterlambatan deteksi sebatas satu interval polling. Push (SSE atau WebSocket) bukan bagian keputusan ini.
8. **`proxy.ts` tidak bisa mendeteksi pencabutan.** Ia tetap hanya gerbang kasar. Verifikasi final di BE, dan klien mengetahui pencabutan dari respons API.

### Kontrak yang diminta dari BE

| Kebutuhan | Keterangan |
|---|---|
| `sid` per login, satu aktif per akun | Login baru mencabut yang lama, dari klien mana pun |
| Error `SESSION_REVOKED` (401) | Pada setiap endpoint terproteksi untuk `sid` yang sudah dicabut |
| Progres terikat akun | Antrian, booking, dan order dikunci dengan `userId` dan `eventId`, bukan `sid` |
| Token slot baru saat login ulang | Access token antrian diterbitkan ulang untuk slot yang sama |
| Sesi WebView turunan sesi app | Penukaran one-time code tidak mencabut sesi app |
| Pembatasan laju login | Mencegah dua perangkat saling mencabut berulang |

## Konsekuensi

- **Positif**: customer tidak kehilangan posisi atau booking karena pindah perangkat. Satu akun tidak bisa dipakai paralel untuk menguasai banyak slot. FE tetap tipis karena progres tidak pernah di klien.
- **Negatif / biaya**: BE harus mengelola `sid` dan pencabutan, serta menjamin progres terikat akun. Perangkat lama baru tahu pada polling berikutnya. Customer yang berbagi akun akan saling mengeluarkan (disengaja).
- **Yang harus dijaga**:
  - Tambahkan `SESSION_REVOKED` ke `ApiErrorCode` di `packages/core/errors`, pemetaannya di `api`, dan key i18n `session.revoked.*`.
  - Skenario MSW `session-revoked` di `mocks/` (ADR-0009), dipakai test dan demo.
  - Test ViewModel: `SESSION_REVOKED` pada queue, booking, dan payment menghasilkan layar sesi dicabut, tanpa pemanggilan cancel.
  - Playwright dengan dua browser context: login di B mengeluarkan A, progres tetap terlihat di B.
  - Aturan steering yang sudah ada tetap berlaku: tidak ada progres di `localStorage`, Context, atau global store (ADR-0004).
- **Sudah dijawab tim**: login app mobile mencabut sesi web, dan sebaliknya (aturan sama untuk semua klien). Booking yang berjalan dilanjutkan dari perangkat baru tanpa mengisi NIK lagi karena NIK terikat akun ([ADR-0011](0011-nik-linked-to-account.md)).
- **Pertanyaan terbuka untuk klien dan BE**:
  - Perlu refresh token? Bila ada, rotasinya harus mengikuti `sid` yang sama supaya `sid` yang dicabut tidak bisa memperbarui diri.
