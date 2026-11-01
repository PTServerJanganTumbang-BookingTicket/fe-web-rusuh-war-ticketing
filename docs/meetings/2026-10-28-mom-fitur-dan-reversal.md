# MoM: Fitur tambahan dan reversal keputusan

- **Tanggal rapat**: (isi tanggal rapat; dicatat di repo 2026-10-28)
- **Peserta**: (isi)
- **Sumber**: catatan rapat yang direkam, disalin apa adanya di §1 dan §2
- **Status**: keputusan rapat. ADR belum diubah; dampak ADR di §3, pertanyaan terbuka di §4.

Bagian 1 dan 2 adalah catatan rapat. Bagian 3 dan 4 adalah analisis tim FE terhadap ADR yang ada, bukan keputusan rapat.

## 1. Fitur yang dibahas

| # | Usulan | Keputusan rapat |
|---|---|---|
| 1 | Daftar_NIK_Teman | Ya, ditambahkan. |
| 2 | Akun_Customer + NIK_Terdaftar | Ya, user wajib menginformasikan NIK saat registrasi. |
| 3 | Immutable Consent_Record saat registrasi | Boleh mendaftarkan NIK selain NIK yang diregistrasi. |
| 4 | Session_TTL_Antrian 4–8 jam + push warning 30 | Untuk menangani bot user, pastikan user menerima state queue: apakah queue masih open atau tidak. Pastikan ada grace period setelah mendapat alokasi, sehingga user yang tidak masuk ke detail page akan me-release antrian berikutnya. Tidak ada TTL antrian karena sudah ada grace period. |
| 5 | Grace_Period 30 dtk + state Pending_Cancellation | Ada grace period saat proses pembayaran: TTL 10 menit ditambah grace period. Skenario auto refund ada, tetapi tidak diimplementasikan di POC; atau ada API terpisah untuk reconcile payment refund. |
| 6 | Status Disputed + email ke customer tentang auto-refund | Email ke user jika payment gagal (callback tidak dikirim payment gateway, atau callback berisi transaksi gagal), dan jika TTL 10 menit terlampaui tanpa transaksi. |
| 7 | Push notification (FCM/APNs), wajib saat giliran, opsional di bawah posisi 10 | Tidak diimplementasikan. |
| 8 | Batas kapasitas antrian + QUEUE_FULL | Perlu state queue cap (300.000). Perlu state QUEUE di homepage. User me-refresh sendiri secara manual untuk status queue. Status QUEUE: `OPEN / AVAILABLE`, `SOLD_OUT`, `SELLING_OUT_FAST`, `QUEUE_FULL`. |
| 9 | Menunggu stok sampai 15 menit saat stok 0 di giliran user | Tidak perlu menunggu 15 menit. |
| 10 | State "Menunggu kasir": posisi 0 tetapi belum ada slot | Tidak perlu grace period ketika posisi = 0. User langsung bisa ke detail page. |
| 11 | Tombol "Batal Antrian" + konfirmasi | API baru untuk requirement ini. |
| + | Batas antrian per user | 1 user (login) maksimal antri di 5 event (catatan minor). |
| + | Token | (1) identity token (JWT); (2) event access token, mengikat proses queue → booking → payment. |
| 12 | Meninggalkan Payment_Page dan Booking langsung melepas hold | Payment page masih bisa diakses selama token valid (user login dan non-login). Ada API untuk terminate proses payment bagi non-login, dan API untuk terminate proses booking bagi non-login. |
| 13 | Live stock polling di Detail page | Mekanisme polling frontend setiap 5 detik. |
| 14 | Pemulihan antrian guest lintas perangkat | "ADR-005" mengikat guest ke device fingerprint, eksplisit tidak lintas perangkat. Tidak valid / di luar scope: antrian guest tidak bisa dipertahankan lintas perangkat. |
| 15 | Link verifikasi email 24 jam, maksimal 3 kirim ulang per jam | Oke, dikonfirmasi. |
| 16 | CAPTCHA adaptif, 5 akun/IP/jam, 3 join/customer/menit | Dikonfirmasi. Perlu fitur CAPTCHA sebelum masuk detail ticket page. Yang gagal CAPTCHA tidak boleh mengakses detail ticket page. |
| 17 | Teks `beforeunload`, isi ringkasan order, buffer ETA +20% | Dilewati. |

## 2. Reversal yang diputuskan

| Topik | Keputusan rapat |
|---|---|
| Transport realtime | SSE. |
| Kegagalan Dukcapil | Fail closed. |
| Pengiriman e-tiket | Ke email user, atau email yang diinput. |
| BR-07 | Perbarui `update-requirement-rusuh-booking-tiket.md`: kalimat BR-07 diluruskan, bukan dihapus. BR-07 valid untuk customer login, tidak valid untuk customer non-login. |
| Sumber kebenaran stok | Stok di-update ke Aurora, lalu Redis di-update dengan TTL 5 detik. API get available ticket membaca Redis, fallback ke Aurora bila gagal. Redis otoritatif di hot path, Aurora untuk rekonsiliasi. |
| Metode pembayaran | Bank transfer, Over the Counter Payment, GoPay (e-wallet). Validasi mana yang lebih mudah. |
| Dashboard | CloudWatch EMF. |
| Nomor kursi | Tidak diimplementasikan. |
| Grace saat giliran ("grant grace") | Tidak perlu grace period, sama dengan butir 10. |

## 3. Dampak terhadap ADR dan kode FE (analisis, belum diterapkan)

**Konflik terbesar: ada customer non-login (guest).** Butir 12, 14, BR-07, dan pengiriman e-tiket mengandaikan alur guest. `docs/ai/steering/product.md`, [ADR-0010](../adr/0010-login-single-session-progress-persistence.md), dan [ADR-0011](../adr/0011-nik-linked-to-account.md) masih menyatakan login wajib sebelum antre. "ADR-005 device fingerprint" di butir 14 bukan [ADR-0005](../adr/0005-server-authoritative-time.md) FE (yang membahas waktu server); kemungkinan berasal dari ADR tingkat solusi.

| MoM | ADR / lokasi | Dampak |
|---|---|---|
| 1–3 NIK teman, NIK saat registrasi, NIK selain milik sendiri | ADR-0011 (besar) | Menjawab pertanyaan terbuka "NIK diisi kapan" (saat registrasi). Aturan "NIK terisi otomatis, hanya-baca, tidak ada input NIK di booking" tidak lagi utuh karena NIK teman bisa dipilih. |
| Dukcapil fail closed | ADR-0011, ADR-0009 | NIK ditolak saat Dukcapil tidak tersedia. Butuh kode error baru dan layar yang jelas. |
| 4, 10, grace saat giliran | ADR-0005, ADR-0009, modul `queue` | Grace setelah alokasi: butuh kode error saat alokasi hangus sebelum masuk detail. Auto-redirect di posisi 0 sudah sesuai. State "queue open/closed" perlu ada di stream/snapshot antrian. |
| 5–6 grace pembayaran, email gagal | ADR-0006, ADR-0005, modul `payment` | Hold = 10 menit + grace, jadi butir `custom_expiry` 9 menit di ADR-0006 perlu direvisi. Countdown FE tetap bertanya ke server di nol. Layar gagal/expired menyebut email. |
| 7 push tidak diimplementasikan | ADR-0016 | Catatan: tidak ada push; pembaruan hanya saat halaman terbuka. |
| 8 cap 300.000, status queue di Home | ADR-0007, modul `catalog` | `EventStatus` (kini `upcoming`, `on_sale`, `sold_out`) berubah ke empat status MoM, plus kode error `QUEUE_FULL`. Refresh manual cocok dengan Home statis (ISR 15 detik). |
| 11 Batal Antrian, maks 5 event | modul `queue`, ADR-0009, ADR-0010 | Use case `CancelQueue` + dialog konfirmasi Radix; kode error batas 5 antrian. |
| Dua token | ADR-0007, ADR-0008, ADR-0010, `auth-login-register.md` | Cookie `access_token` saat ini = event access token. Identity token butuh cookie sendiri; menjawab pertanyaan terbuka nama cookie di dokumen auth. |
| 12 payment page selama token valid, API terminate | ADR-0008, ADR-0010, modul `booking`/`payment` | Use case terminate booking dan payment untuk non-login. |
| 13 polling stok 5 detik | ADR-0004, ADR-0016, `bookingQueries.ts` | Sejalan dengan ADR-0016 (stok tidak lewat SSE), tetapi kode kini 15 detik (`STOCK_REFRESH_MS`). |
| 14 guest tidak lintas perangkat | ADR-0010 | Progres terikat akun hanya untuk user login; guest terikat perangkat. |
| 15 verifikasi email | `auth-login-register.md` | Masukan alur register. |
| 16 CAPTCHA sebelum detail | ADR baru, ADR-0007 | Gerbang di `proxy.ts` atau di token, plus kode error. |
| Transport SSE | ADR-0016 | Terkonfirmasi; kandidat Accepted. |
| E-tiket ke email input | `product.md` | "Email e-tiket diambil dari akun" hanya untuk user login. |
| BR-07 | `product.md`, header `useBookingViewModel` | Diluruskan sesuai rapat. |
| Metode pembayaran | ADR-0006, `payment/domain/order.ts` | Tambah OTC (instruksi kode bayar), GoPay menggantikan QRIS umum, `PaymentMethod` berubah. |
| Redis/Aurora, CloudWatch EMF, nomor kursi, butir 9 dan 17 | Tidak ada | Tanpa dampak ADR FE. Stok tampil bisa terlambat sekitar 5 detik; popup `STOCK_INSUFFICIENT` saat submit tetap penentu. |

Usulan ADR baru: alur guest vs login, model dua token, gerbang CAPTCHA, batas dan pembatalan antrian. Usulan revisi: ADR-0006, ADR-0010, ADR-0011, catatan di ADR-0016.

## 4. Pertanyaan terbuka

Pemilik usulan: **K** = klien, **BE** = backend, **FE** = FE web, **M** = mobile, **T** = seluruh tim.

| # | Pertanyaan | Asal | Pemilik | Menghambat |
|---|---|---|---|---|
| Q1 | Apakah customer non-login (guest) benar boleh antre, booking, dan bayar? Jika ya, "login wajib sebelum antre" di `product.md` dicabut atau hanya berlaku untuk sebagian event? | 12, 14, BR-07, e-tiket | K, T | ADR alur guest, ADR-0010, ADR-0011 |
| Q2 | "ADR-005 device fingerprint" merujuk dokumen ADR yang mana? Di mana dokumen itu disimpan, dan apakah FE perlu mengirim fingerprint? | 14 | T | ADR alur guest |
| Q3 | Bagaimana guest mengidentifikasi dirinya (NIK diinput per booking? email?) dan dari mana batas 3 tiket per NIK dihitung untuk guest? | 12, BR-07 | K, BE | ADR-0011, modul `booking` |
| Q4 | Teks BR-07 lengkap dan lokasi `update-requirement-rusuh-booking-tiket.md` (tidak ada di repo FE). | BR-07 | T | `product.md` |
| Q5 | NIK teman: batas 3 tiket dihitung per NIK pemegang tiket atau per akun pemesan? Satu tiket satu NIK? Berapa maksimal NIK teman per akun? | 1, 3 | K, BE | ADR-0011 |
| Q6 | Apakah NIK teman diverifikasi Dukcapil saat ditambahkan, dan bagaimana persetujuan (consent) pemilik NIK dicatat? Butir 3 berjudul "Immutable Consent_Record", tetapi keputusannya hanya menyebut boleh mendaftarkan NIK lain. | 3 | K, BE | ADR-0011 |
| Q7 | Apakah satu NIK boleh menjadi NIK teman di beberapa akun, sementara sebagai NIK akun tetap unik? | 1, 2 | K, BE | ADR-0011 |
| Q8 | Dukcapil fail closed: pesan dan aksi untuk user (coba lagi nanti? antre tetap tersimpan?). Berlaku saat registrasi, tambah NIK teman, atau juga saat booking? | Reversal | K, BE, FE | Kode error, layar |
| Q9 | Berapa lama grace period setelah alokasi antrian? Kode error apa saat hangus, dan apakah user kembali ke awal antrian? | 4 | BE | Modul `queue`, ADR-0009 |
| Q10 | Bentuk state "queue masih open atau tidak" di respons dan stream antrian. | 4 | BE | Kontrak SSE ADR-0016 |
| Q11 | Berapa lama grace pembayaran? Apakah FE menampilkan 10 menit saja (server yang menutup setelah grace), dan apakah ada status order baru (`pending_cancellation`, `disputed`)? | 5, 6 | BE | ADR-0006, `OrderStatus` |
| Q12 | Ambang `SELLING_OUT_FAST`, dan apakah `OPEN` dan `AVAILABLE` satu status yang sama? Apakah `upcoming` (belum dibuka) tetap ada? | 8 | K, BE | Modul `catalog` |
| Q13 | Batas 5 event per user: dihitung dari antrian aktif bersamaan atau total? Kode errornya? Berlaku juga untuk guest? | Catatan minor | BE | Modul `queue` |
| Q14 | Kontrak API Batal Antrian (path, efek ke slot, bisa join lagi?). | 11 | BE | Modul `queue` |
| Q15 | Dua token: nama cookie, TTL masing-masing, siapa yang menerbitkan event access token untuk guest, dan apakah `proxy.ts` memverifikasi keduanya? | Token | BE, FE | ADR baru, ADR-0007 |
| Q16 | API terminate booking/payment untuk non-login: dipicu tombol eksplisit saja, atau juga saat meninggalkan halaman? Butir 12 menyebut payment page tetap bisa diakses selama token valid. | 12 | K, BE | Modul `booking`, `payment` |
| Q17 | User login: apakah juga punya aksi terminate, atau hanya menunggu TTL? | 12 | K | Modul `booking`, `payment` |
| Q18 | CAPTCHA: provider, kapan "adaptif" memicu tantangan, diverifikasi BE di mana (saat menerbitkan event access token?), dan layar untuk user yang gagal. | 16 | BE, FE | ADR baru |
| Q19 | Apakah akun yang email-nya belum terverifikasi boleh antre? | 15 | K | Alur register |
| Q20 | Metode pembayaran final: OTC lewat gerai mana, GoPay deeplink di WebView mobile (ADR-0008), dan apakah VA bank masih ada di bawah "bank transfer"? | Reversal | K, BE, M | ADR-0006 |
| Q21 | E-tiket guest: email diinput di layar mana (booking atau payment), dan apakah divalidasi? | Reversal | K, FE | `product.md`, modul `booking` |
| Q22 | Kontrak SSE (path, nama event, heartbeat, penutupan di status akhir, CORS dengan credentials) disetujui BE? Apakah stream antrian juga membawa status queue open/closed (Q10)? | Reversal | BE | ADR-0016 |
| Q23 | Polling stok 5 detik saat flash crowd: BE sanggup dengan cache Redis TTL 5 detik? Interval dengan jitter seperti sekarang? | 13 | BE | `bookingQueries.ts` |
