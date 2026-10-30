# Requirements Document

## Introduction

**Rusuh Booking Tiket** adalah sistem pemesanan tiket konser secara online yang dirancang khusus untuk menangani lonjakan trafik ekstrem (_flash crowd_) pada saat penjualan tiket dibuka. Tantangan utama sistem ini bukan sekadar fitur fungsionalnya, melainkan menjaga pengalaman pengguna tetap stabil dan adil ketika jumlah permintaan jauh melebihi jumlah tiket yang tersedia.

Sistem terdiri dari empat halaman utama:
- **Home Page** — daftar event yang tiketnya dijual secara online
- **Waiting Room** — ruang tunggu antrian virtual sebelum pengguna diizinkan membeli (dapat diakses tanpa login; identitas diminta saat masuk Detail Ticket)
- **Detail Ticket Page** — pemilihan kategori dan jumlah tiket dengan input NIK + email per attendee
- **Payment Page** — pembayaran dengan batas waktu 10 menit, dapat dikonsumsi oleh web maupun mobile

Dua prinsip kunci yang menjadi landasan desain sistem:
1. Jaga pengalaman pengguna (_user experience_) apapun kondisi sistem di belakangnya
2. _"Jangan PHP"_ — pengguna yang sudah masuk antrian dan memulai booking dijamin dapat menyelesaikan perjalanannya (_journey_) hingga akhir tanpa diputus sepihak

---

## 🗺️ Alur Pengguna Sekilas

Setiap Customer melewati 4 tahap berurutan:

```
┌─────────────┐     ┌───────────────────┐     ┌──────────────────────┐     ┌──────────────────┐
│  HOME PAGE  │────▶│   WAITING ROOM    │────▶│ DETAIL TICKET PAGE   │────▶│  PAYMENT PAGE    │
│             │     │                   │     │                      │     │                  │
│ Lihat event │     │ Antrian virtual   │     │ Pilih tiket          │     │ Bayar            │
│ yang buka   │     │ (FCFS, real-time) │     │ NIK + email per org  │     │ Batas 10 menit   │
└─────────────┘     └───────────────────┘     └──────────────────────┘     └──────────────────┘
       │                     │                          │                           │
  Login/Guest           Boleh tanpa login          Wajib isi identitas       Konfirmasi &
  diperbolehkan         (antrian terbuka)           (NIK + email tiap org)    terima e-tiket
```

**Aturan "Jangan PHP":** Setiap Customer yang sudah mendapat giliran dan berhasil masuk ke halaman pemilihan tiket **dijamin** mendapatkan slot tiket — sistem tidak boleh mengeluarkannya secara sepihak selama TTL berlaku.

---

## ⏱️ Batas Waktu Kritis

| Tahap | Timer | Durasi | Mulai Berjalan |
|-------|-------|--------|----------------|
| Pilih tiket (Detail Ticket) | TTL_Booking | **5 menit** | Saat slot diberikan (`granted_at`), bukan saat halaman dibuka |
| Bayar (Payment) | TTL_Pembayaran | **10 menit** | Saat booking berhasil dibuat (Hold berhasil) |
| **Total maksimum** | — | **15,5 menit** | Dari slot diberikan sampai selesai bayar (termasuk grace) |
| Grace period (toleransi callback) | Grace_Period | **30 detik** | Setelah TTL_Pembayaran habis |

---

## 🔢 Batasan Bisnis Kunci

| Aturan | Nilai | Catatan |
|--------|-------|---------|
| Maksimal tiket per transaksi | **3 tiket** | Lintas kategori diperbolehkan (mis. 1 VIP + 1 Festival + 1 Premium); bukan per NIK kumulatif |
| NIK unik per tiket per event | **1 NIK = 1 Tiket = 1 Event** | Berlaku lintas semua kategori & semua pembeli; validasi real-time on-blur |
| Satu keterlibatan aktif per event | **1 antrian ATAU 1 booking** | Berlaku HANYA untuk customer login (BR-07); tamu tidak dibatasi |
| Transport update posisi antrian | **SSE** (push) | Server push via EventSource; fallback ke adaptive polling jika SSE tidak tersedia |
| Estimasi waktu tunggu | +20% buffer | Selalu sedikit lebih tinggi dari aktual (prinsip: lebih baik lebih cepat) |
| Metode pembayaran | **VA, E-Wallet GoPay** | Via Midtrans Core API; QRIS, kartu kredit, dan OTC di luar cakupan POC |
| Kapasitas antrian per event | **300.000** | Kelebihan ditolak `QUEUE_FULL` secara fail-fast |

---

## 📋 Daftar Requirement Sekilas

| # | Requirement | Prioritas | Siapa yang Terdampak |
|---|-------------|-----------|----------------------|
| 0 | Autentikasi & NIK | 🔴 Kritis | Customer, Operator |
| 1 | Daftar Event | 🔴 Kritis | Customer |
| 2 | Pengarahan ke Antrian/Tiket | 🔴 Kritis | Customer |
| 3 | Antrian Virtual (Waiting Room) | 🔴 Kritis | Customer, Tim Teknis |
| 4 | Pemilihan Tiket, NIK Attendee & Identitas Pemesan | 🔴 Kritis | Customer |
| 5 | Timer Booking (Server-Authoritative) | 🔴 Kritis | Customer, Operator |
| 6 | Proses Pembayaran | 🔴 Kritis | Customer, Finance |
| 7 | Notifikasi Email per Attendee | 🟠 Tinggi | Customer |
| 8 | Konsistensi & Keamanan Stok | 🔴 Kritis | Operator, Tim Teknis |
| 9 | Skalabilitas & Ketahanan Sistem | 🔴 Kritis | Operator, Tim Teknis |
| 10 | Keamanan Akses | 🔴 Kritis | Operator, Tim Teknis |
| 11 | Observability Dashboard | 🟠 Tinggi | CTO, Operator |
| 12 | Anti-Bot Prevention | 🟠 Tinggi | Operator |
| 13 | Multi-Language Support | 🟡 Medium | Customer |

---

## Glossary

| Istilah                  | Definisi                                                                                                                                                                              |
| --------------------------| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **System**               | Sistem Rusuh Booking Tiket secara keseluruhan                                                                                                                                         |
| **Home_Page**            | Halaman beranda yang menampilkan daftar event yang tiketnya dijual online                                                                                                             |
| **Waiting_Room**         | Ruang tunggu virtual tempat Customer menunggu giliran masuk ke halaman pembelian                                                                                                      |
| **Detail_Ticket_Page**   | Halaman pemilihan kategori dan jumlah tiket setelah Customer mendapat akses, dengan form NIK + email per attendee                                                                     |
| **Payment_Page**         | Halaman pembayaran dengan batas waktu 10 menit                                                                                                                                        |
| **Queue_Service**        | Layanan yang mengatur antrian virtual, token akses, dan posisi antrian secara real-time                                                                                               |
| **Booking_Service**      | Layanan yang mengelola stok tiket, reservasi sementara (_hold_), dan status booking                                                                                                   |
| **Payment_Gateway**      | Sistem eksternal yang memproses pembayaran dari web/mobile dan mengirim _callback_ status                                                                                             |
| **Email_Service**        | Layanan notifikasi yang mengirim e-tiket atau pemberitahuan booking _expired_ ke Customer                                                                                             |
| **Customer**             | Pengguna akhir yang memilih event, mengantre, memilih tiket, dan melakukan pembayaran                                                                                                 |
| **Access_Token**         | Hak akses sementara yang diberikan kepada Customer untuk masuk ke Detail Ticket Page; juga disebut _Slot_                                                                             |
| **Hold**                 | Penguncian stok tiket sementara saat Customer berada di proses booking dan pembayaran; juga disebut _Reservasi_                                                                       |
| **TTL_Booking**          | Batas waktu Customer berada di Detail Ticket Page untuk memilih tiket (5 menit sejak slot diberikan `granted_at`) sebelum sesi booking kedaluwarsa                                                |
| **TTL_Pembayaran**       | Batas waktu 10 menit untuk menyelesaikan pembayaran sejak booking dibuat, sebelum booking dibatalkan                                                                                  |
| **NIK**                  | Nomor Induk Kependudukan 16 digit yang dipakai sebagai basis pembatasan kuota maksimal 3 tiket per orang per event                                                                    |
| **NIK_Attendee**         | NIK orang yang akan hadir di event dan duduk di bangku tersebut; bisa berbeda dari NIK_Terdaftar buyer                                                                                |
| **Email_Pemesan**        | Satu alamat email milik pemesan yang digunakan sebagai tujuan pengiriman seluruh e-tiket dalam satu transaksi; pemesan bertanggung jawab meneruskan tiket kepada masing-masing attendee.     |
| **NIK_Teman_Tersimpan** | Entri NIK teman yang disimpan oleh Customer pada Daftar_NIK_Teman di profil akun; setiap entri sudah terverifikasi Dukcapil saat penambahan; maksimal 5 entri per Akun_Customer.              |
| **Daftar_NIK_Teman**    | Daftar berisi sampai 5 NIK teman yang tersimpan di profil Akun_Customer; digunakan sebagai opsi cepat saat pemilihan NIK_Attendee di Detail_Ticket_Page tanpa perlu validasi Dukcapil ulang. |
| **Sesi_Pembelian**       | Satu rangkaian proses pembelian oleh satu Customer dalam satu Access_Token, baik Customer yang sudah login (Akun_Customer) maupun Customer tamu (_guest_).                             |
| **Akun_Customer**        | Akun pengguna yang sudah terautentikasi, terdiri dari identitas login (email/nomor HP) dan satu NIK yang terdaftar dan diverifikasi pada saat registrasi.                             |
| **NIK_Terdaftar**        | NIK yang sudah dikaitkan secara permanen dengan satu Akun_Customer dan digunakan sebagai dasar validasi kuota pembelian tiket.                                                        |
| **Idempotency_Key**      | Kunci unik yang memastikan operasi yang dieksekusi lebih dari satu kali menghasilkan efek yang sama seperti dieksekusi sekali                                                         |
| **Disputed**             | Status transaksi pembayaran yang menandakan bahwa callback "pembayaran berhasil" datang setelah booking dibatalkan; transaksi ini memerlukan proses rekonsiliasi dan refund otomatis. |
| **Return_URL**           | URL tujuan redirect yang diberikan ke Payment_Gateway, tempat Customer dikembalikan setelah menyelesaikan (atau membatalkan) proses pembayaran di halaman milik gateway.              |
| **Pending_Cancellation** | Status booking transisional selama grace period 30 detik setelah TTL_Pembayaran habis; booking masih bisa dikonfirmasi jika callback sukses tiba dalam periode ini.                   |
| **Now_Serving**          | Jumlah antrian yang sudah diproses; nilai global yang di-broadcast ke semua user dan dapat di-cache via CDN.                                                                          |
| **Queue_Number**         | Nomor antrian unik per user yang di-assign saat join antrian; disimpan di persistent database untuk setiap Customer (login maupun tamu) agar posisi dapat dipulihkan lintas perangkat.  |
| **Admission_Controller** | Komponen yang mengatur berapa banyak user dari antrian yang diizinkan masuk ke Detail_Ticket_Page berdasarkan free slots dan available tickets.                                       |
| **Grace_Period**         | Periode toleransi 30 detik setelah TTL_Pembayaran habis dimana callback pembayaran sukses masih diterima dan booking dikonfirmasi.                                                    |
| **QRIS**                 | Quick Response Code Indonesian Standard — standar QR code nasional dari Bank Indonesia yang memungkinkan pembayaran dari aplikasi e-wallet, mobile banking, atau aplikasi apapun yang mendukung QRIS; pada sistem ini QRIS di-generate via Midtrans Core API dan ditampilkan langsung di Payment_Page. |
| **Midtrans**             | Payment gateway yang digunakan sistem ini; integrasi via Midtrans Core API memungkinkan sistem menampilkan UI pembayaran sendiri (bukan redirect ke Midtrans Snap); mendukung Virtual Account (multi-bank), E-Wallet (GoPay, ShopeePay, DANA, LinkAja), dan QRIS. |
| **Persetujuan_Data_Pribadi** | Pernyataan persetujuan eksplisit yang diberikan Customer saat registrasi untuk mengizinkan sistem memproses NIK milik pihak ketiga (teman) sebagai data pendamping; bersifat mandatory untuk menyelesaikan registrasi; diatur berdasarkan UU PDP No. 27 Tahun 2022; pencabutan hanya dapat dilakukan melalui tim operasional. |
| **Consent_Record**       | Rekam jejak immutable yang menyimpan bukti persetujuan Customer: timestamp, versi kebijakan privasi, dan identitas akun; digunakan sebagai bukti kepatuhan UU PDP. |
| **Keterlibatan_Aktif**   | Satu posisi antrian atau booking yang belum terminal; dasar penegakan BR-07 untuk customer login. |
| **Pause_Admission**      | Kondisi saat circuit breaker Dukcapil atau payment gateway OPEN; tidak ada grant baru, antrian berhenti maju, posisi tidak hilang. |
| **Pause_TTL_Grace**      | Tambahan 60 detik pada tenggat booking/pembayaran yang sedang berjalan, diberikan saat pause dimulai. |
| **Sold_Out_Sementara**   | Status stok nol tetapi kursi masih dapat kembali dari booking yang kedaluwarsa; final setelah 930 detik. |
| **CAPTCHA_Tak_Terlihat** | Verifikasi berbasis skor tanpa teka-teki; token diambil sebelum sale buka. |
| **Display_Block**        | Jawaban siap-render dari server (`enabled`, `action`, `label_key`, `badge_key`); frontend tidak menghitung presedensi. |

---

## Requirements

---

### Requirement 0: 🔐 Autentikasi Akun dan Pendaftaran NIK

**User Story:** Sebagai operator sistem, saya ingin memastikan setiap Customer yang membeli tiket menyediakan identitas NIK yang valid (baik melalui akun terverifikasi maupun sebagai tamu yang mengisi NIK + email di Detail Ticket), sehingga kuota 3 tiket per orang dapat diberlakukan secara adil dan tidak bisa diakali dengan identitas fiktif.

> **💡 Apa ini?** Customer bisa menelusuri event dan antri tanpa login. Identitas (NIK + email) baru diminta saat ingin membeli. Setiap tiket harus mencantumkan NIK orang yang akan hadir — bukan NIK pembeli secara otomatis. Saat registrasi, Customer memberikan persetujuan eksplisit (wajib, tidak bisa dilewati) bahwa sistem boleh menyimpan NIK teman yang mereka tambahkan ke profil akun — ini diperlukan untuk fitur Daftar NIK Teman dan memastikan kepatuhan UU PDP No. 27/2022. Guest tidak perlu consent karena NIK teman yang diinput saat checkout tidak disimpan permanen.

#### Acceptance Criteria

1. THE System SHALL mengizinkan Customer untuk menelusuri Home_Page, mengklik event, dan masuk ke Waiting_Room (antrian) TANPA harus login terlebih dahulu; WHEN Customer mendapat giliran dan masuk ke Detail_Ticket_Page, THE System SHALL mewajibkan Customer untuk menyediakan identitas (NIK + email) terverifikasi sebelum dapat melanjutkan transaksi ke Payment_Page. Dengan kata lain, _gate_ identitas berada di titik masuk Detail_Ticket_Page / sebelum pembayaran, bukan di titik masuk antrian.
2. WHEN Customer mendaftar akun, THE System SHALL mewajibkan Customer untuk mendaftarkan tepat satu NIK_Terdaftar yang terdiri dari 16 digit angka; akun tidak dapat digunakan untuk pembelian tiket sebelum NIK_Terdaftar terdaftar.
3. THE System SHALL memastikan satu NIK hanya dapat didaftarkan pada satu Akun_Customer secara global di seluruh sistem; IF Customer mencoba mendaftarkan NIK yang sudah terikat ke akun lain, THEN THE System SHALL menolak pendaftaran dan menampilkan pesan yang menyatakan NIK tersebut sudah digunakan.
4. WHEN NIK_Terdaftar sudah dikaitkan dengan Akun_Customer, THE System SHALL tidak mengizinkan perubahan NIK_Terdaftar secara mandiri oleh Customer; perubahan hanya dapat dilakukan melalui proses verifikasi yang melibatkan tim operasional.
5. WHEN Customer memilih tiket, THE Detail_Ticket_Page SHALL menampilkan form per-seat yang memunculkan field wajib NIK_Attendee (16 digit) dan Email_Pemesan untuk SETIAP tiket yang dipilih (jumlah NIK = jumlah tiket yang dibeli); "tiket pertama" didefinisikan sebagai tiket dari kategori yang ditampilkan paling atas dalam UI; IF Customer sedang login dan memiliki data identitas tersimpan, THE System SHALL mem-_prefill_ field NIK_Attendee dan Email_Pemesan tiket pertama dari data Customer tersebut namun tetap dapat diedit; IF Customer adalah tamu (_guest_), seluruh field NIK_Attendee dan Email_Pemesan diisi manual oleh Customer.
6. WHEN Customer (termasuk Customer tamu/_guest_ yang belum login) mendapat Access_Token dan mengakses Detail_Ticket_Page, THE System SHALL meminta Customer memasukkan dan memverifikasi identitas — minimal NIK (16 digit) dan email — sebelum operasi Hold dan pelanjutan ke Payment_Page diizinkan; IF Customer belum menyediakan identitas yang valid, THEN THE System SHALL memblokir aksi "lanjut ke pembayaran" dan menampilkan form identitas yang harus dilengkapi lebih dulu. Posisi antrian Customer tetap dipertahankan selama proses pengisian identitas berlangsung (dalam batas TTL_Booking).
7. WHEN Customer mendaftar akun, THE System SHALL memverifikasi email melalui verification link (bukan OTP) yang dikirim ke alamat email yang didaftarkan; akun tidak dapat digunakan untuk pembelian tiket sebelum email terverifikasi.
8. THE Verification_Link SHALL berlaku selama 24 jam; IF link kedaluwarsa, THE System SHALL memungkinkan Customer untuk meminta kirim ulang verification link dengan batas maksimal 3 kali per jam.
8a. WHEN Customer mengisi form registrasi akun, THE System SHALL menampilkan pernyataan persetujuan pemrosesan data pribadi pihak ketiga yang wajib disetujui Customer sebelum registrasi dapat diselesaikan; pernyataan ini harus mencakup minimal: (a) penjelasan bahwa sistem akan memungkinkan Customer menyimpan NIK milik orang lain (teman) sebagai data pendamping untuk kemudahan pembelian tiket bersama, (b) tujuan pemrosesan data: validasi identitas pemegang tiket pada event, (c) pernyataan bahwa pencabutan persetujuan hanya dapat dilakukan melalui tim operasional (bukan secara mandiri), dan (d) referensi ke Kebijakan Privasi lengkap yang memuat hak-hak subjek data sesuai UU PDP No. 27 Tahun 2022; Customer harus secara aktif mencentang checkbox persetujuan (checkbox tidak boleh di-pre-checked); IF Customer tidak mencentang checkbox, THEN THE System SHALL memblokir penyelesaian registrasi dan menampilkan pesan bahwa persetujuan ini wajib untuk menggunakan layanan.
8b. THE System SHALL menyimpan rekam jejak persetujuan Customer (consent record) yang mencakup: timestamp saat persetujuan diberikan, versi dokumen kebijakan privasi yang disetujui, dan identitas akun; rekam jejak ini bersifat immutable (tidak dapat diubah atau dihapus) dan digunakan sebagai bukti kepatuhan terhadap UU PDP No. 27 Tahun 2022; WHEN Customer meminta informasi tentang persetujuan yang telah diberikan, THE System SHALL dapat menampilkan detail rekam jejak tersebut melalui halaman pengaturan akun.
9. WHEN Customer mendaftarkan NIK_Terdaftar pada saat registrasi, THE System SHALL memvalidasi keabsahan NIK terhadap Dukcapil (atau penyedia verifikasi identitas yang disepakati tim SJT); validasi identitas ini dilakukan HANYA pada saat registrasi, bukan berulang pada setiap transaksi pembelian. IF validasi Dukcapil tidak dapat diselesaikan secara sinkron (mis. layanan Dukcapil tidak tersedia), THEN THE System SHALL menempatkan NIK pada status `PENDING_NIK_VALIDATION`, menyimpan hasil validasi yang berhasil ke cache agar tidak memanggil Dukcapil berulang, dan memberlakukan kebijakan akses sesuai keputusan operasional (deferred validation). Catatan: metode validasi final (langsung vs deferred) diserahkan ke tim SJT untuk mitigasi keamanan data.
10. THE System SHALL menyediakan fitur Daftar_NIK_Teman pada setiap Akun_Customer yang telah memberikan persetujuan pemrosesan data pribadi pihak ketiga sesuai AC8a; fitur ini memungkinkan Customer menyimpan NIK teman yang sering diajak hadir event bersama; maksimal 5 entri NIK teman dapat tersimpan per Akun_Customer; fitur ini tidak tersedia untuk Customer tamu (_guest_) karena NIK yang diinput guest saat checkout hanya digunakan untuk keperluan transaksi satu kali dan tidak disimpan secara permanen di sistem.
11. WHEN Customer menambahkan NIK teman ke Daftar_NIK_Teman melalui halaman profil akun, THE System SHALL melakukan validasi keabsahan NIK tersebut terhadap Dukcapil sebelum menyimpannya; IF validasi Dukcapil tidak tersedia (sinkron), THE System SHALL menempatkan NIK pada status `PENDING_DUKCAPIL_VALIDATION` sesuai pola deferred validation yang sama dengan registrasi (AC9).
12. THE System SHALL memungkinkan Customer untuk menghapus entri NIK dari Daftar_NIK_Teman kapan saja; penghapusan tidak mempengaruhi tiket yang sudah dibeli menggunakan NIK tersebut sebelumnya.

---

### Requirement 1: 🗂️ Menampilkan Daftar Event

**User Story:** Sebagai Customer, saya ingin melihat daftar seluruh event beserta status ketersediaannya, sehingga saya dapat menentukan event mana yang masih bisa dibeli tiketnya.

> **💡 Apa ini?** Halaman utama menampilkan semua event dengan status real-time. Jika event masih tersedia, Customer bisa klik langsung. Jika sudah sold out, tampilan dinonaktifkan dengan label jelas.

#### Acceptance Criteria

1. THE Home_Page SHALL menampilkan daftar seluruh event yang tiketnya dijual secara online, dengan setiap event menampilkan minimal nama event, tanggal pelaksanaan, dan status ketersediaan tiket.
2. IF sebuah event berstatus _available_, THEN THE Home_Page SHALL menampilkan event tersebut dalam keadaan aktif (_clickable_) tanpa memperhatikan nilai stok tiket saat itu.
3. IF sebuah event berstatus _sold out_ atau tidak _available_, THEN THE Home_Page SHALL menampilkan event tersebut dalam keadaan non-aktif (_disabled_) dengan label status "Sold Out" atau "Tidak Tersedia".
4. WHEN data event diperbarui (stok berubah atau status berubah), THE Home_Page SHALL mencerminkan status terbaru dalam waktu tidak lebih dari 5 detik.
5. IF data event gagal diambil dari backend, THEN THE Home_Page SHALL menampilkan pesan yang menyatakan data tidak dapat dimuat sementara tetap memungkinkan Customer untuk melakukan navigasi (halaman tidak _crash_).
6. IF tidak ada event yang tersedia untuk dijual, THEN THE Home_Page SHALL menampilkan pesan kosong yang informatif dan tidak menampilkan daftar kosong tanpa keterangan.
7. THE Home_Page SHALL menampilkan dua field status terpisah untuk setiap event: (a) `status` yang menunjukkan ketersediaan stok (`AVAILABLE`, `SELLING_OUT_FAST`, `SOLD_OUT`), dan (b) `queue_state` yang menunjukkan izin masuk antrian (`NOT_OPEN`, `DIRECT`, `OPEN`, `FULL`); Server SHALL mengirim blok `display` siap-render (`enabled`, `action`, `label_key`, `badge_key`) sehingga frontend tidak perlu memutuskan presedensi status.
8. WHEN `queue_state` bernilai `FULL`, THE Home_Page SHALL menonaktifkan tombol beli dengan label 'Antrian Penuh' sehingga Customer mengetahui antrian penuh SEBELUM mengklik, bukan sesudah.

---

### Requirement 2: 🔀 Pengarahan ke Antrian atau Halaman Tiket

**User Story:** Sebagai Customer, saya ingin diarahkan ke tempat yang tepat setelah mengklik event, sehingga saya tidak perlu bingung harus ke mana dan proses berjalan dengan lancar.

> **💡 Apa ini?** Setelah klik event, sistem otomatis memutuskan apakah Customer langsung masuk ke pilih tiket (jika tidak ada antrian) atau masuk ruang tunggu (jika antrian aktif). Customer tidak perlu tahu cara kerjanya — sistem yang mengurus.

#### Acceptance Criteria

1. WHEN Customer mengklik event yang _available_ dan Queue_Service mendeteksi adanya antrian aktif, THE System SHALL mengarahkan Customer ke Waiting_Room.
2. WHEN Customer mengklik event yang _available_ dan Queue_Service mendeteksi tidak ada antrian, THE System SHALL menerbitkan Access_Token yang terikat pada Customer dan event tersebut, lalu mengarahkan Customer langsung ke Detail_Ticket_Page.
3. THE Queue_Service SHALL menerbitkan satu Access_Token unik per Customer per event pada satu waktu; THE Queue_Service SHALL mengelola antrian secara terisolasi per event — setiap event memiliki antrian, Queue_Number counter, dan nilai Now_Serving yang independen, sehingga antrian satu event tidak memengaruhi antrian event lain.
4. IF Customer mencoba mengakses Detail_Ticket_Page dengan Access_Token yang tidak terikat pada Customer tersebut, sudah kedaluwarsa, atau sudah dicabut, THEN THE System SHALL menolak akses dan mengarahkan Customer kembali ke proses antrian.
5. IF Access_Token Customer sudah kedaluwarsa atau dicabut saat Customer berada di alur pembelian, THEN THE System SHALL menampilkan notifikasi yang menjelaskan alasan penolakan dan mengarahkan Customer kembali ke proses antrian.
6. IF Customer yang sudah memiliki Access_Token aktif untuk sebuah event mencoba mendapatkan Access_Token baru untuk event yang sama, THEN THE System SHALL menjamin idempotenci secara ketat menggunakan mekanisme atomik (_atomic check-and-set_ atau _distributed lock_) sehingga hanya satu Access_Token yang pernah ada per Customer per event pada satu waktu; THE System SHALL mengembalikan token yang sudah ada tanpa menerbitkan token baru bahkan dalam kondisi permintaan bersamaan (_concurrent requests_), dan SHALL mengarahkan Customer langsung ke Detail_Ticket_Page menggunakan token tersebut.

---

### Requirement 3: ⏳ Antrian Virtual (Waiting Room)

**User Story:** Sebagai Customer, saya ingin mengetahui posisi antrian saya secara real-time dan dijamin tidak kehilangan giliran, sehingga saya bisa menunggu dengan tenang tanpa harus melakukan apa pun secara manual.

#### 📐 Keputusan Arsitektur: SSE vs Adaptive Polling

| Dimensi | Adaptive Polling + CDN | SSE (ECS Fargate) | Keputusan |
|---------|------------------------|-------------------|-----------|
| Biaya per event (4 jam, 300k user) | ~$300 (API GW $47 + CDN $247 + compute) | ~$14 | ✅ SSE |
| NFR-06 p95 < 1s SEMUA posisi | ❌ Hanya tier 1–2 (posisi ≤100) | ✅ ~0ms push, semua posisi | ✅ SSE |
| CDN cacheable | ✅ Ya (now_serving global) | ❌ Per-connection | Tidak menjadi penentu |
| Mobile/background tab | ✅ Tidak terpengaruh | ⚠️ Butuh heartbeat 15 detik | Dimitigasi |
| Horizontal scaling | Stateless round-robin | Redis Pub/Sub lintas pod | Keduanya feasible |
| Client simplicity | Manage polling interval + tier | EventSource API, auto-reconnect built-in | ✅ SSE |
| Connection management | Stateless | 300k persistent connections (ECS Fargate tuned) | Dikelola via ECS |

**Kesimpulan:** SSE (Server-Sent Events) dipilih sesuai ADR-005 (24 Oktober 2026) karena: (1) ~21× lebih murah dari polling pada arsitektur target ($14 vs $300/event); (2) memenuhi NFR-06 p95 < 1 detik untuk SEMUA posisi antrian (polling hanya memenuhi untuk posisi ≤100); (3) client implementation lebih sederhana dengan `EventSource` API yang memiliki auto-reconnect built-in. Referensi: ADR-003, ADR-005.

> **💡 Apa ini?** Ruang tunggu virtual yang adil (first-come, first-served). Server mendorong update posisi antrian secara real-time melalui **Server-Sent Events (SSE)** — metode yang dipilih sesuai ADR-005 karena ~21× lebih murah dari adaptive polling pada skala 300.000 concurrent user ($14 vs $300 per event) dan memenuhi NFR-06 p95 < 1 detik untuk semua posisi antrian.
>
> Saat giliran Customer tiba, server mendorong event `your_turn` ke client. Redirect ke Detail Ticket hanya terjadi jika Backend mengkonfirmasi ada slot tersedia (Admission Controller). Posisi antrian **tidak hilang** saat tab ditutup — session dijaga di Backend. Customer bisa kembali kapan saja selama TTL_Booking belum dimulai atau masih berlaku.

#### Acceptance Criteria

1. WHILE Customer berada di Waiting_Room, THE Queue_Service SHALL menampilkan posisi antrian Customer dihitung dari posisi paling depan dengan format "Anda antrian ke-N" dimana N > 0; posisi 0 tidak ditampilkan karena memicu transisi keluar dari Waiting_Room sesuai AC3.
2. THE System SHALL menggunakan mekanisme **Server-Sent Events (SSE)** sebagai mekanisme pengiriman update posisi antrian secara real-time; server mendorong event `status` yang mengandung nilai `now_serving` ke seluruh client yang terhubung setiap kali posisi antrian berubah atau setiap 10 detik sebagai heartbeat; klien menghitung posisi antrian dengan formula `posisi = queue_number - now_serving`; SSE dipilih menggantikan adaptive polling karena: (a) biaya ~21× lebih rendah pada skala 300.000 concurrent user ($14 vs $300 per event), (b) memenuhi NFR-06 p95 < 1 detik untuk SEMUA posisi antrian (polling hanya memenuhi untuk posisi ≤100), dan (c) client menggunakan `EventSource` API standar browser dengan auto-reconnect built-in; koneksi SSE menggunakan cookie `HttpOnly` (web) atau header `Authorization` (mobile) untuk autentikasi, token TIDAK ditempatkan di URL; WHERE koneksi SSE tidak tersedia (jaringan memblokir), THE System SHALL menggunakan fallback adaptive polling ke endpoint REST `/queue/{event}/serving`.
3. WHEN giliran Customer tiba (posisi antrian menjadi 0), THE Queue_Service SHALL tetap berada dalam status "menunggu slot" hingga Admission_Controller mengkonfirmasi ketersediaan slot; frontend SHALL segera melakukan request POST ke endpoint claim-token; THE Booking_Service SHALL memeriksa kondisi: (a) freeSlots > 0 (ada kasir idle yang tersedia) DAN (b) availableTickets > 0 (ada tiket yang belum Hold/Sold); ONLY IF kedua kondisi terpenuhi, THE Queue_Service SHALL menerbitkan Access_Token dan secara otomatis mengarahkan Customer ke Detail_Ticket_Page tanpa interaksi tambahan; IF salah satu kondisi tidak terpenuhi, THEN sistem menerapkan perilaku sesuai AC3a atau AC15.

3a. WHEN posisi antrian Customer adalah 0 DAN Admission_Controller mendeteksi tidak ada slot tersedia (freeSlots = 0) namun tiket masih tersedia (availableTickets > 0), THE System SHALL menampilkan pesan kepada Customer: "Giliran Anda sudah tiba — menunggu kasir tersedia. Anda akan diarahkan otomatis segera." disertai indikator visual (spinner/animasi) yang menunjukkan sistem sedang memproses; THE System SHALL terus melakukan polling pada interval 1 detik untuk mendeteksi slot yang baru tersedia; WHEN slot tersedia, THE Queue_Service SHALL segera menerbitkan Access_Token dan mengarahkan Customer ke Detail_Ticket_Page secara otomatis tanpa interaksi Customer; Customer tidak perlu melakukan tindakan apapun — proses ini sepenuhnya otomatis.
4. IF pengalihan ke Detail_Ticket_Page gagal setelah Access_Token diterbitkan, THEN THE System SHALL menampilkan tombol manual untuk Customer masuk ke halaman tersebut dengan Access_Token yang sudah diterbitkan, tanpa menerbitkan ulang token baru.
5. THE Queue_Service SHALL mempertahankan session antrian Customer di sisi server; session antrian terikat pada session token yang disimpan di browser (cookie atau localStorage); WHEN Customer menutup tab, menutup browser, atau koneksinya terputus, posisi antrian TIDAK dilepas karena state otoritatif tersimpan di Backend; WHEN Customer membuka kembali aplikasi atau halaman Waiting_Room — baik dari tab yang sama maupun tab/browser baru di perangkat yang sama — dan session token masih valid, THE Queue_Service SHALL memulihkan posisi antrian terkini secara otomatis; untuk Customer tamu (_guest_), session token disimpan di localStorage/cookie browser sehingga recovery hanya berlaku selama token tersebut ada di perangkat yang sama; jika browser storage dibersihkan atau Customer membuka incognito, session token hilang dan posisi tidak dapat dipulihkan (trade-off yang diterima untuk guest).
6. IF session token antrian Customer tidak ditemukan (mis. localStorage dibersihkan, incognito mode, perangkat berbeda untuk guest) saat Customer mencoba mengakses kembali Waiting_Room, THEN THE System SHALL mengarahkan Customer kembali ke halaman awal untuk memulai proses antrian ulang dengan mendapatkan Queue_Number baru di posisi paling belakang.
7. THE Queue_Service SHALL menjamin antrian bersifat _first-come-first-served_; tidak ada mekanisme yang memungkinkan Customer melompati posisi antrian Customer lain.
8. WHERE fitur estimasi waktu tersedia, THE Queue_Service SHALL menampilkan estimasi waktu tunggu berdasarkan laju rata-rata pemrosesan antrian dalam 5 menit terakhir dengan menerapkan buffer konservatif +20% pada hasil kalkulasi, sehingga estimasi yang ditampilkan selalu sedikit lebih tinggi dari aktual untuk mencegah kekecewaan user; estimasi diperbarui setiap kali posisi antrian berubah.
9. THE Queue_Service SHALL melepas posisi antrian Customer HANYA dalam kondisi berikut: (a) Customer menekan tombol "Batal Antrian" dan mengonfirmasi dialog konfirmasi — posisi dilepas segera setelah konfirmasi; (b) TTL_Booking habis setelah slot diberikan; (c) TTL_Pembayaran + Grace_Period habis; (d) Pembayaran berhasil dikonfirmasi. Menutup tab, menutup browser, atau koneksi terputus TIDAK melepas posisi antrian.

10. WHEN Customer menutup tab atau browser Waiting_Room, THE System SHALL menampilkan pesan _browser beforeunload_ yang bersifat informatif dan menenangkan: "Posisi antrian Anda tersimpan aman di server. Anda bisa kembali kapan saja selama session masih aktif." — pesan ini TIDAK mengandung frasa yang mengindikasikan posisi akan hilang, karena posisi memang tidak hilang saat tab ditutup.

11. WHEN Customer menekan tombol "Batal Antrian", THE System SHALL menampilkan dialog konfirmasi yang menyatakan bahwa posisi antrian tidak dapat dipulihkan setelah dibatalkan; posisi antrian dilepas hanya setelah Customer mengonfirmasi dialog tersebut.

12. WHEN giliran Customer tiba dan Access_Token diterbitkan, IF Customer tidak mengakses Detail_Ticket_Page dan TTL_Booking habis (5 menit sejak slot diberikan), THEN THE Queue_Service SHALL secara otomatis melepas slot tersebut melalui mekanisme _scheduler_ di sisi server dan mempromosikan Customer berikutnya dalam antrian; Customer yang bersangkutan mendapat notifikasi bahwa gilirannya telah kedaluwarsa.

13. WHEN Customer mengakses kembali Waiting_Room setelah menutup tab, menutup browser, atau setelah koneksi terputus — dan session token masih valid — THE Queue_Service SHALL selalu memeriksa status terkini antrian Customer pada setiap akses: IF Access_Token sudah diterbitkan dan masih berlaku, THE System SHALL menampilkan tombol "Giliran Anda sudah tiba — Masuk Sekarang" tanpa menerbitkan token baru; IF posisi antrian masih aktif (belum giliran), THE System SHALL menampilkan posisi antrian terkini dan melanjutkan mekanisme SSE; IF Customer masih di posisi 0 dan sedang menunggu slot (kondisi AC3a), THE System SHALL menampilkan kembali pesan "Menunggu kasir tersedia" dan melanjutkan polling 1 detik.

14. WHILE Customer berada di Waiting_Room, THE System SHALL menampilkan jumlah tiket yang berstatus Available secara _real-time_ (tidak termasuk tiket yang berstatus Held atau Sold) yang diperbarui setiap kali stok berubah.

15. WHEN giliran Customer tiba dan stok Available pada saat itu adalah 0, THE System SHALL menampilkan pesan kepada Customer yang menginformasikan bahwa tiket saat ini sedang habis namun mungkin akan kembali tersedia dari pembatalan booking sebelumnya, dan memberikan Customer pilihan untuk tetap menunggu (maksimal 15 menit) atau keluar; IF Customer memilih tetap menunggu dan stok kembali tersedia dalam 15 menit, THE System SHALL langsung menerbitkan Access_Token; IF 15 menit berlalu tanpa stok tersedia, THE System SHALL menotifikasi Customer dan melepas posisi antrian.

16. WHEN Queue_Service mengalami restart atau _recovery_ setelah kegagalan, THE Queue_Service SHALL memulihkan seluruh posisi antrian dari _persistent storage_ sebelum menerima permintaan baru; Customer tidak boleh kehilangan posisi antrian akibat restart Queue_Service.

17. IF Queue_Service tidak dapat merespons permintaan _poll_ posisi antrian dari klien (karena _overload_, sedang _recovery_, atau gangguan jaringan), THEN THE Waiting_Room SHALL tetap menampilkan posisi terakhir yang berhasil diambil disertai indikator visual "sedang memperbarui..." dan _timestamp_ terakhir kali posisi berhasil diperbarui; posisi antrian Customer di server tetap dipertahankan dan tidak terpengaruh oleh kegagalan _poll_ tersebut.

18. THE Queue_Service SHALL menggunakan mekanisme kalkulasi posisi berbasis Now_Serving: backend hanya menyimpan dan mengirimkan nilai Now_Serving (jumlah antrian yang sudah diproses) yang bersifat global dan identik untuk semua user; frontend menghitung posisi dengan formula `posisi = Queue_Number - Now_Serving`; Queue_Number disimpan di persistent database (backend) untuk SETIAP Customer — baik login (diikat ke Akun_Customer) maupun tamu (_guest_, diikat ke token antrian/sesi tamu yang persisten) — sehingga memungkinkan recovery posisi saat pindah device untuk kedua jenis Customer; nilai Now_Serving dapat di-cache via CDN karena identik untuk semua user.

19. THE Queue_Service SHALL menggunakan counter atomic untuk menghasilkan Queue_Number unik saat Customer join antrian; counter ini disimpan di persistent database untuk menghindari duplikasi saat 200.000+ akses bersamaan.

20. THE Queue_Service SHALL memberlakukan batas kapasitas maksimum antrian per event yang dikonfigurasi (default: 300.000); WHEN Customer mencoba join antrian dan kapasitas antrian sudah penuh, THE System SHALL menolak permintaan secara langsung (_fail fast_) dengan kode error `QUEUE_FULL` dan pesan yang menyatakan antrian sedang penuh serta meminta Customer mencoba beberapa saat lagi, TANPA melakukan buffering tanpa batas atau menempatkan Customer pada posisi antrian; Home_Page SHALL menampilkan `queue_state: FULL` dengan tombol dinonaktifkan SEBELUM Customer mencoba join sehingga Customer mengetahui antrian penuh sebelum mengklik.

21. WHEN Customer yang sama mengakses sistem dari beberapa perangkat (_multi-device_) untuk event yang sama — baik Customer login maupun tamu (_guest_) — THE System SHALL menampilkan state yang identik di seluruh perangkat (posisi antrian, status booking, dan sisa waktu TTL) karena seluruh state bersifat server-authoritative; countdown TTL_Booking dan TTL_Pembayaran dihitung dari _expiry timestamp_ server yang sama sehingga tidak ada perbedaan antar perangkat; Customer tetap memegang satu Sesi_Pembelian dan satu slot aktif yang sama lintas perangkat. Untuk Customer login, kontinuitas lintas perangkat diikat ke Akun_Customer; untuk Customer tamu, kontinuitas diikat ke token antrian/sesi tamu yang persisten (mis. dibawa melalui _link_ atau identifier sesi), sehingga guest pun dapat memulihkan posisi antrian saat pindah perangkat.

22. WHEN Customer mencoba join antrian, THE System SHALL menerapkan CAPTCHA tak terlihat (invisible CAPTCHA berbasis skor) yang berjalan tanpa interaksi user; token CAPTCHA diambil SEBELUM sale dibuka dan disegarkan berkala sehingga tidak ada tantangan interaktif (puzzle/gambar) saat join; IF provider CAPTCHA tidak tersedia (timeout/error), THE System SHALL tetap menerima join request (fail-open) dan menyalakan alarm untuk tim operasional.

---

### Requirement 4: 🎟️ Pemilihan Tiket, Validasi NIK per Attendee, dan Identitas Pemesan

**User Story:** Sebagai Customer, saya ingin memilih kategori dan jumlah tiket dengan informasi stok yang akurat dan batasan yang jelas, sehingga saya tidak membuang waktu memilih tiket yang ternyata tidak bisa dibeli.

> **💡 Apa ini?** Halaman pilih tiket menampilkan semua kategori dengan harga dan stok terkini. Setiap tiket wajib mencantumkan NIK orang yang akan hadir. Pemesan mengisi SATU email yang berlaku untuk seluruh tiket dalam transaksi. Aturan ketat berlaku: **1 NIK = 1 Tiket = 1 Event** — satu NIK hanya bisa ada di satu tiket per event, berlaku lintas semua kategori dan lintas semua pembeli. Validasi NIK dilakukan real-time (saat selesai mengisi, bukan saat submit): sistem langsung cek keabsahan NIK ke Dukcapil (untuk guest dan NIK baru) dan ketersediaan NIK di event tersebut. Untuk pemesan login, NIK teman bisa dipilih dari daftar tersimpan di profil.

#### Acceptance Criteria

1. THE Detail_Ticket_Page SHALL menampilkan detail event beserta seluruh kategori tempat (_seat category_) yang tersedia.
2. THE Detail_Ticket_Page SHALL menampilkan jumlah stok tiket yang tersedia dan harga untuk setiap kategori.
3. WHEN stok tiket suatu kategori habis (0), THE Detail_Ticket_Page SHALL menampilkan kategori tersebut sebagai tidak tersedia (_disabled_) sehingga Customer tidak dapat memilihnya.
4. IF jumlah tiket yang dipilih Customer menyebabkan total tiket dalam satu Sesi_Pembelian melebihi 3 (gabungan seluruh kategori), THEN THE System SHALL memblokir aksi "lanjut ke pembayaran" dan THE Booking_Service SHALL menolak penambahan tiket tersebut dengan menampilkan pesan yang menyebutkan batas maksimal 3 tiket per transaksi; dalam kondisi ini operasi Hold tidak pernah dicoba dan booking tidak pernah dibuat. Batas ini berlaku per Akun_Customer (bila login) dan selalu per NIK_Attendee/NIK pembeli, bukan per sesi atau per perangkat.
5. WHEN Customer memilih tiket, THE Detail_Ticket_Page SHALL menampilkan form yang terdiri dari: (a) field NIK_Attendee (16 digit) untuk SETIAP tiket yang dipilih — jumlah field NIK = jumlah tiket yang dibeli — karena setiap bangku harus terikat pada NIK orang yang akan hadir, dan (b) SATU field Email_Pemesan yang berlaku untuk seluruh tiket dalam transaksi tersebut; perbedaan perilaku berdasarkan tipe Customer:
   - IF Customer login (Akun_Customer): field NIK_Attendee tiket pertama di-prefill dari NIK_Terdaftar buyer namun dapat diedit; untuk tiket selanjutnya, Customer dapat MEMILIH dari Daftar_NIK_Teman yang tersimpan di profil (NIK yang sudah terverifikasi Dukcapil sebelumnya, tidak perlu validasi ulang) ATAU mengisi NIK baru secara manual (NIK baru yang diisi manual wajib melalui validasi Dukcapil real-time); field Email_Pemesan di-prefill dari email Akun_Customer namun dapat diedit.
   - IF Customer guest: seluruh field NIK_Attendee (termasuk NIK buyer sendiri untuk tiket pertama) diisi manual dan SEMUA wajib melalui validasi Dukcapil real-time; field Email_Pemesan diisi manual.
5a. WHEN Customer selesai mengisi field NIK_Attendee (on-blur atau saat pindah ke field berikutnya), THE System SHALL melakukan DUA validasi secara berurutan secara real-time per-field:
   (a) Validasi keabsahan NIK terhadap Dukcapil: berlaku untuk semua NIK yang diisi manual oleh Customer guest, dan NIK yang diisi manual oleh Customer login yang bukan berasal dari Daftar_NIK_Teman; IF NIK berasal dari Daftar_NIK_Teman, validasi Dukcapil di-skip karena sudah dilakukan saat NIK ditambahkan ke profil;
   (b) Validasi ketersediaan NIK di event (Event NIK Availability Check): THE Booking_Service SHALL memeriksa apakah NIK tersebut sudah terikat pada booking apapun (status Hold, Sold, atau PENDING_DUKCAPIL_VALIDATION) untuk event yang sama, TANPA MEMANDANG KATEGORI TIKET; IF NIK sudah dipakai di booking manapun untuk event yang sama, THE System SHALL menampilkan error segera pada field yang bersangkutan dengan pesan "NIK ini sudah memiliki tiket untuk event ini"; validasi ini berlaku untuk SEMUA input NIK, termasuk NIK dari Daftar_NIK_Teman;
   validasi (a) dan (b) dilakukan per-field saat on-blur, sehingga Customer mendapat feedback segera tanpa harus menunggu submit.
5b. IF layanan Dukcapil tidak dapat diakses saat validasi real-time NIK dilakukan (timeout, error, atau sedang tidak tersedia), THEN THE System SHALL **memblokir booking** (fail-closed) dan menampilkan pesan bahwa validasi identitas sedang tidak tersedia; Customer TIDAK DIIZINKAN melanjutkan ke pembayaran dengan NIK yang belum terverifikasi; NIK dari NIK_Terdaftar atau Daftar_NIK_Teman yang sudah terverifikasi sebelumnya tetap dapat digunakan tanpa panggilan Dukcapil baru.
6. WHEN Customer menekan tombol lanjut ke pembayaran, THE Booking_Service SHALL melakukan validasi deduplikasi NIK dalam satu transaksi: tidak boleh ada dua atau lebih tiket dalam cart yang sama memiliki NIK_Attendee yang identik; IF ditemukan NIK duplikat, THE System SHALL menolak permintaan dan menampilkan pesan yang menyebutkan tiket mana yang memiliki NIK sama beserta highlight visual pada field yang bermasalah.
7. WHEN Customer menekan tombol lanjut ke pembayaran, THE Booking_Service SHALL melakukan validasi NIK lintas transaksi sebagai lapisan validasi final (setelah real-time on-blur di AC5a): setiap NIK_Attendee yang diinput tidak boleh sudah ada di booking aktif (status Hold, Sold, atau PENDING_DUKCAPIL_VALIDATION) untuk event yang sama, TANPA MEMANDANG KATEGORI TIKET — aturan ini berlaku lintas seluruh kategori (VIP, Festival, dll.) dan lintas seluruh pembeli/akun (1 NIK = 1 Tiket = 1 Event); IF salah satu NIK_Attendee sudah terpakai di event tersebut dalam kategori apapun, THE System SHALL menolak tiket tersebut saja dengan pesan spesifik "NIK [XXXX...XXXX] sudah memiliki tiket untuk event ini" dan highlight visual pada tiket yang bermasalah, tanpa menolak seluruh transaksi; Customer dapat mengganti NIK untuk tiket tersebut tanpa mengulang pilihan tiket dari awal.
8. WHEN Customer menekan tombol lanjut ke pembayaran, THE Booking_Service SHALL memeriksa akumulasi tiket pada event yang sama berdasarkan NIK sebagai basis utama kuota: (a) total tiket yang terikat pada setiap NIK (NIK_Attendee yang diinput maupun NIK pembeli), dan (b) WHERE Customer sedang login, juga total tiket yang terikat pada Akun_Customer tersebut (termasuk booking aktif yang masih dalam TTL_Pembayaran maupun booking yang sudah selesai dibayar); IF salah satu sumber sudah mencapai atau melebihi 3 tiket, THEN THE Booking_Service SHALL menolak permintaan dan menampilkan pesan yang menyebutkan batas maksimal 3 tiket per NIK/akun untuk event tersebut. Basis NIK memastikan kuota tetap berlaku untuk Customer tamu (_guest_) yang tidak memiliki Akun_Customer.
9. WHEN Customer menekan tombol lanjut ke pembayaran dengan total tiket antara 1 hingga 3, semua kategori yang dipilih memiliki stok tersedia, seluruh NIK_Attendee valid dan unik (intra dan lintas transaksi), dan kuota akun/NIK belum terpenuhi, THE Booking_Service SHALL mengeksekusi validasi kuota dan operasi Hold seluruh kategori yang dipilih sebagai satu transaksi atomik tunggal; IF semua validasi berhasil, THE Booking_Service SHALL membuat booking baru yang terikat pada Sesi_Pembelian tersebut (dan pada Akun_Customer bila Customer login) dengan TTL_Pembayaran 10 menit; IF validasi kuota atau Hold pada salah satu kategori manapun gagal, THEN seluruh transaksi dibatalkan (_all-or-nothing_) tanpa ada Hold yang tersisa.
10. IF operasi Hold pada salah satu kategori gagal karena stok tidak mencukupi saat eksekusi, THEN THE Booking_Service SHALL membatalkan seluruh transaksi Hold (_all-or-nothing_), melepas Hold pada kategori manapun yang mungkin sudah berhasil dalam transaksi yang sama, menampilkan informasi stok terkini untuk seluruh kategori yang dipilih, dan mempertahankan pilihan tiket Customer di UI agar dapat disesuaikan tanpa mengulang dari awal.
11. IF operasi Hold atau pembuatan booking gagal karena gangguan sistem atau layanan yang tidak berkaitan dengan ketersediaan stok, THEN THE Booking_Service SHALL menampilkan pesan error generik kepada Customer, mengembalikan Customer ke halaman pemilihan tiket dengan pilihan tiket yang sudah dipilih tetap dipertahankan, dan tidak memulai TTL_Pembayaran.

12. WHILE Customer berada di Detail_Ticket_Page, THE System SHALL memperbarui jumlah stok tersedia untuk setiap kategori secara _real-time_ dengan melakukan _poll_ ke server setiap 10 detik; WHEN stok suatu kategori mencapai 0 selama Customer berada di halaman, THE Detail_Ticket_Page SHALL segera menonaktifkan (_disable_) pilihan kategori tersebut tanpa memerlukan _refresh_ manual dari Customer.

13. THE Detail_Ticket_Page SHALL menampilkan satu field Email_Pemesan yang wajib diisi dan berlaku untuk seluruh tiket dalam transaksi; THE System SHALL memvalidasi bahwa Email_Pemesan memiliki format email yang valid (minimal terdiri dari karakter @, domain, dan TLD) sebelum mengizinkan Customer melanjutkan ke pembayaran; IF format email tidak valid, THE System SHALL menampilkan pesan error di bawah field Email_Pemesan; IF Customer login, field Email_Pemesan di-prefill dari email Akun_Customer.

14. BEFORE rendering form NIK di Detail_Ticket_Page, THE System SHOULD memanggil endpoint `GET /api/quota/{nik}/{event_id}` untuk mendapatkan informasi sisa kuota NIK_Customer yang sedang login (atau NIK yang di-prefill untuk guest); endpoint ini mengembalikan: (a) `remaining_quota` — jumlah tiket yang masih bisa dibeli oleh NIK tersebut untuk event ini (0–3), (b) `existing_bookings` — daftar booking aktif (Hold/Sold) yang sudah ada untuk NIK tersebut di event ini; informasi ini digunakan untuk menampilkan pesan informatif kepada Customer tentang sisa kuota mereka sebelum memilih tiket.

15. WHEN Customer sudah memiliki Hold aktif untuk event yang sama dan mencoba membuat Hold baru (dengan pilihan tiket yang berbeda), THE Booking_Service SHALL menggantikan (replace) Hold lama dengan Hold baru secara atomik; Hold baru tidak menambah jumlah Hold — hanya menggantikan; stok dari Hold lama dilepas terlebih dahulu sebelum stok baru di-Hold dalam satu transaksi; TTL_Pembayaran di-reset ke 10 menit penuh dari waktu Hold baru dibuat; behavior ini memungkinkan Customer mengubah pilihan tiket tanpa harus menunggu Hold lama expired.

16. THE Booking_Service SHALL menggunakan kode error standar untuk respons API yang gagal, dengan format JSON `{ "error_code": "...", "message": "..." }`; kode error yang didefinisikan:
   - `INSUFFICIENT_STOCK` (HTTP 409): stok tidak mencukupi untuk salah satu atau lebih kategori yang diminta
   - `QUOTA_EXCEEDED` (HTTP 409): kuota per NIK atau per Akun_Customer sudah terpenuhi (sudah memiliki 3 tiket untuk event tersebut)
   - `HOLD_EXPIRED` (HTTP 410): Hold yang direferensikan sudah expired atau tidak ditemukan
   - `INVALID_NIK_FORMAT` (HTTP 400): format NIK tidak valid (bukan 16 digit angka)
   - `DUPLICATE_NIK_IN_REQUEST` (HTTP 400): ditemukan NIK yang sama lebih dari sekali dalam satu request
   - `NIK_ALREADY_USED` (HTTP 409): NIK sudah digunakan di booking lain untuk event yang sama
   Frontend SHALL menerjemahkan error_code ke pesan lokal sesuai bahasa yang dipilih Customer (Req 13).

---

### Requirement 5: ⏱️ Timer Booking Server-Authoritative

**User Story:** Sebagai operator sistem, saya ingin timer sesi booking dikelola oleh server, sehingga Customer tidak dapat memanipulasi waktu dari sisi klien dan slot antrian tidak tertahan secara tidak adil.

> **💡 Apa ini?** Timer 5 menit saat memilih tiket dikelola oleh server — Customer tidak bisa menghentikan atau memanipulasi waktu dari browser. Jika waktu habis sebelum ke pembayaran, tiket yang dipegang dilepas kembali ke pool dan Customer dikembalikan ke halaman utama.

#### Acceptance Criteria

1. WHEN Access_Token diberikan kepada Customer (slot granted), THE Booking_Service SHALL memulai TTL_Booking dengan durasi 300 detik (5 menit) di sisi server dan menyimpan _expiry timestamp_ (`granted_at` + 300 detik) yang menjadi acuan tunggal validitas sesi; TTL_Booking dimulai pada saat slot diberikan (`granted_at`), BUKAN pada saat Customer membuka Detail_Ticket_Page; TTL_Booking dan TTL_Pembayaran adalah dua timer independent — total waktu maksimum untuk menyelesaikan seluruh alur adalah 15,5 menit (5 menit TTL_Booking + 10 menit TTL_Pembayaran + 30 detik Grace_Period).
2. WHILE Customer berada di Detail_Ticket_Page, THE Detail_Ticket_Page SHALL menampilkan hitung mundur yang disinkronisasi dengan waktu server setiap 30 detik untuk mencerminkan sisa waktu TTL_Booking yang akurat.
3. WHEN Customer me-_refresh_ Detail_Ticket_Page, THE System SHALL menampilkan sisa waktu TTL_Booking berdasarkan _expiry timestamp_ dari server, bukan dimulai ulang dari 300 detik.
4. WHEN TTL_Booking habis dan Customer belum melanjutkan ke pembayaran, THE Booking_Service SHALL membatalkan sesi booking dan mencabut Access_Token Customer.
5. IF Customer memiliki Hold stok saat TTL_Booking habis, THEN THE Booking_Service SHALL melepas Hold stok tersebut dan mengembalikannya ke pool Available secara atomik.
6. WHEN TTL_Booking habis, THE Queue_Service SHALL menerima sinyal slot kosong dan mempromosikan Customer berikutnya dalam antrian untuk mengisi slot tersebut.
7. WHEN TTL_Booking habis, THE System SHALL menampilkan notifikasi kepada Customer bahwa sesi booking telah berakhir dalam waktu tidak lebih dari 5 detik setelah batas waktu terlampaui.
8. WHEN notifikasi TTL_Booking habis ditampilkan, THE System SHALL mengarahkan Customer keluar dari halaman booking ke Home_Page.
9. IF Customer mencoba melanjutkan ke pembayaran setelah _expiry timestamp_ TTL_Booking terlampaui berdasarkan waktu server, THEN THE Booking_Service SHALL menolak permintaan tersebut dengan respons yang menyatakan sesi booking telah berakhir, tanpa meneruskan permintaan ke Payment_Gateway.

---

### Requirement 6: 💳 Proses Pembayaran dengan Grace Period

**User Story:** Sebagai Customer, saya ingin menyelesaikan pembayaran tiket dalam batas waktu yang jelas dengan berbagai pilihan metode pembayaran, sehingga saya dapat memilih cara yang paling nyaman untuk menyelesaikan transaksi.

> **💡 Apa ini?** Customer punya 10 menit untuk menyelesaikan pembayaran dengan dua pilihan metode di POC: **Virtual Account** (BCA, BNI, BRI, CIMB) dan **E-Wallet GoPay** — diintegrasikan via **Midtrans Core API**. Artinya UI pemilihan metode dan tampilan detail pembayaran (nomor VA, deep link GoPay) sepenuhnya dibangun di sisi sistem kita, bukan redirect ke halaman Midtrans. Data sensitif kartu tidak pernah melewati server kita (PCI-DSS compliance). QRIS, kartu kredit, dan OTC di luar cakupan POC karena tidak dapat menghormati TTL 10 menit di sisi gateway. Untuk VA: perlu diperhatikan bahwa beberapa bank memiliki minimum expiry > 10 menit — jika customer transfer setelah booking expired, transaksi masuk jalur disputed dan refund manual.

#### Acceptance Criteria

1. WHEN Customer mengakses Payment_Page, THE Payment_Page SHALL menampilkan hitung mundur TTL_Pembayaran yang disinkronisasi dengan waktu server setiap 1 detik, dimulai dari sisa waktu sejak booking dibuat hingga mencapai 00:00.
2. THE Payment_Page SHALL menampilkan ringkasan pesanan (_order summary_) yang mencakup nama event, tanggal pelaksanaan, kategori tiket, jumlah tiket per kategori, harga per tiket, total harga yang harus dibayar, serta daftar NIK_Attendee dan Email_Pemesan untuk setiap tiket yang dipesan; ringkasan ini harus ditampilkan secara jelas sebelum Customer memilih metode pembayaran dan mengonfirmasi pembayaran.
3. WHEN Customer memilih metode pembayaran dan mengonfirmasi, THE System SHALL memanggil endpoint Midtrans Core API yang sesuai dengan metode yang dipilih: (a) Virtual Account: sistem memanggil Midtrans Bank Transfer API dan menampilkan nomor VA, nama bank, jumlah yang harus dibayar, dan batas waktu VA pada Payment_Page; (b) E-Wallet GoPay: sistem memanggil Midtrans E-Money API dan menampilkan deep link ke aplikasi GoPay; data sensitif kartu tidak pernah melalui server sistem ini; THE System SHALL menampilkan konfirmasi yang jelas kepada Customer tentang gateway pembayaran yang digunakan ("Pembayaran Anda diproses secara aman melalui Midtrans") agar Customer merasa aman bertransaksi.

4. WHEN Payment_Gateway mengirimkan _callback_ status pembayaran (berhasil/gagal/tertunda), THE Booking_Service SHALL memproses _callback_ tersebut secara idempoten menggunakan Idempotency_Key; _callback_ duplikat dengan Idempotency_Key yang sama tidak boleh mengubah status booking yang sudah ditetapkan dan tidak boleh memicu pengiriman e-tiket atau pengurangan stok lebih dari satu kali.
5. WHEN pembayaran berhasil dikonfirmasi oleh Payment_Gateway sebelum TTL_Pembayaran habis, THE Booking_Service SHALL mengonfirmasi booking, mengurangi stok tiket secara permanen, dan memicu pengiriman e-tiket ke Email_Pemesan dalam waktu 60 detik setelah konfirmasi diterima.
6. IF Payment_Gateway tidak dapat dihubungi saat Customer mencoba membayar, THEN THE System SHALL menampilkan pesan error yang mengindikasikan gangguan sementara, mempertahankan status booking dan Hold stok, dan mengizinkan Customer untuk mencoba ulang selama TTL_Pembayaran masih berlaku.
7. WHEN TTL_Pembayaran habis dan pembayaran belum dikonfirmasi, THE Booking_Service SHALL mengubah status booking menjadi Pending_Cancellation dan memulai Grace_Period selama 30 detik; selama Grace_Period, IF callback sukses tiba dari Payment_Gateway, THE Booking_Service SHALL mengonfirmasi booking dan menerbitkan tiket; IF Grace_Period berlalu tanpa callback sukses, THE Booking_Service SHALL membatalkan booking secara final, melepas Hold stok, memberikan sinyal slot kosong ke Queue_Service, dan memicu pengiriman email notifikasi expired ke Customer dalam waktu 60 detik setelah pembatalan.
8. IF Customer mencoba melakukan pembayaran setelah _expiry timestamp_ TTL_Pembayaran terlampaui berdasarkan waktu server, THEN THE Booking_Service SHALL menolak permintaan tersebut dengan respons yang menyatakan waktu pembayaran telah habis, tanpa meneruskan permintaan ke Payment_Gateway.
9. THE Payment_API SHALL selalu merespons setiap permintaan dalam format REST/JSON yang identik untuk semua jenis klien (web maupun mobile) tanpa memandang asal atau waktu permintaan; keseragaman format ini adalah invariant tanpa kondisi dari Payment_API yang berlaku kapan pun API beroperasi.

10. IF Payment_Gateway mengirimkan _callback_ status "pembayaran berhasil" setelah Grace_Period berakhir (lebih dari 30 detik setelah TTL_Pembayaran habis) dan booking sudah dibatalkan secara final, THEN THE Booking_Service SHALL menolak pemrosesan booking tersebut, menandai transaksi pembayaran sebagai **Disputed** dalam sistem, dan mencatat seluruh detail transaksi untuk keperluan rekonsiliasi keuangan; refund **tidak otomatis** di POC — dilaporkan di dashboard dan dieksekusi manual melalui dashboard payment gateway; THE Booking_Service SHALL NOT mengaktifkan kembali booking yang sudah dibatalkan dalam kondisi apapun akibat _callback_ tersebut.

11. THE Payment_Page SHALL menampilkan **dua** metode pembayaran yang tersedia di POC: (a) **Transfer Bank VA** (BCA, BNI, BRI, CIMB), dan (b) **E-Wallet GoPay**; Kartu kredit, QRIS, dan Over the Counter (OTC) **di luar cakupan POC** karena tidak dapat menghormati TTL 10 menit di sisi gateway; IF Midtrans API tidak mengembalikan ketersediaan salah satu metode (mis. metode sedang maintenance), THEN THE Payment_Page SHALL menyembunyikan metode tersebut saja dan tetap menampilkan metode lain yang tersedia; IF tidak ada satupun metode yang tersedia, THEN THE Payment_Page SHALL menampilkan pesan yang menginformasikan bahwa tidak ada metode pembayaran yang tersedia saat ini beserta saran untuk mencoba beberapa saat lagi, tanpa menyembunyikan halaman atau membiarkan Customer tanpa keterangan.

12. WHEN Customer kembali ke Return_URL setelah menyelesaikan proses di halaman Payment_Gateway, THE System SHALL mengabaikan parameter status yang terdapat di URL redirect dan SHALL menentukan status pembayaran secara eksklusif dengan mengambil status booking terkini dari backend; ini mencegah manipulasi status melalui URL.

13. WHEN Customer kembali ke Return_URL dan status booking masih Held (webhook konfirmasi dari Payment_Gateway belum diterima), THE System SHALL menampilkan halaman "Menunggu konfirmasi pembayaran" yang melakukan _polling_ ke backend setiap 3 detik untuk memperbarui status; halaman ini SHALL terus polling hingga status menjadi Sold (sukses), Cancelled (gagal/expired), atau TTL_Pembayaran habis.

14. WHEN Payment_Gateway mengirimkan _webhook_ ke sistem, THE Booking_Service SHALL memverifikasi keaslian _webhook_ dengan memvalidasi HMAC _signature_ yang disertakan di _header_ permintaan menggunakan _secret key_ yang disepakati bersama Payment_Gateway; IF validasi _signature_ gagal, THEN THE Booking_Service SHALL menolak _webhook_ tersebut dengan respons HTTP 401 tanpa memproses isinya.

15. WHEN sistem membuat transaksi Virtual Account di Midtrans, THE System SHALL mencoba mengatur VA expiry sesuai sisa TTL_Pembayaran yang tersisa; WHEN bank menerapkan minimum VA expiry yang melebihi sisa TTL_Pembayaran (mis. bank minimum 15–60 menit sedangkan sisa TTL hanya 10 menit), THE System SHALL menggunakan minimum expiry yang diizinkan bank tersebut dan menampilkan peringatan eksplisit kepada Customer pada Payment_Page: "Nomor VA ini aktif hingga [VA_expiry_time], namun booking Anda akan dibatalkan jika pembayaran tidak terdeteksi sebelum [TTL_Pembayaran_end_time]. Transfer setelah waktu booking habis tidak dapat dikonfirmasi dan akan diproses sebagai refund otomatis."; IF Customer melakukan transfer ke VA setelah TTL_Pembayaran habis namun dalam jangka waktu VA masih aktif di bank, THEN callback dari Midtrans diproses menggunakan mekanisme disputed transaction sesuai AC10.

16. WHEN Customer memilih metode E-Wallet, THE System SHALL menampilkan pilihan e-wallet yang didukung di POC: **GoPay**; WHEN Customer memilih GoPay dan mengonfirmasi, THE System SHALL memanggil Midtrans E-Money API dan menampilkan deep link ke aplikasi GoPay pada perangkat mobile; WHEN Customer menyelesaikan pembayaran di aplikasi GoPay dan kembali ke aplikasi atau browser sistem, THE System SHALL menerapkan mekanisme polling 3 detik yang sama dengan Return_URL flow (cek status dari backend, bukan dari parameter redirect) untuk mendeteksi konfirmasi pembayaran.

17. WHEN Customer menekan tombol back atau mencoba meninggalkan Payment_Page sebelum menyelesaikan pembayaran, THE System SHALL menampilkan dialog konfirmasi yang menyatakan "Jika Anda meninggalkan halaman ini, tiket yang Anda pesan akan dilepas. Lanjutkan?"; IF Customer mengonfirmasi keluar, THE Booking_Service SHALL melepas Hold stok segera dan membatalkan booking; IF Customer membatalkan dialog, THE System SHALL mempertahankan Customer di Payment_Page tanpa perubahan.

18. WHEN Customer menutup tab atau browser Payment_Page secara langsung, THE System SHALL menampilkan peringatan _browser beforeunload_; Hold stok tetap aktif sampai TTL_Pembayaran habis sebagai server-side fallback.

19. WHEN Customer sudah memilih metode pembayaran dan ingin menggantinya selama status booking masih `AWAITING_PAYMENT`, THE System SHALL mengizinkan penggantian metode: transaksi lama dibatalkan ke payment gateway, transaksi baru dibuat dengan metode yang dipilih; TTL_Pembayaran tetap dihitung dari waktu booking awal (tidak di-reset).

---

### Requirement 7: 📧 Notifikasi Email per Attendee

**User Story:** Sebagai Customer, saya ingin menerima konfirmasi atau pemberitahuan melalui email setelah transaksi selesai atau gagal, sehingga saya memiliki bukti transaksi dan mengetahui hasil pembelian tiket saya.

> **💡 Apa ini?** Setelah pembayaran berhasil, e-tiket dikirim ke satu Email_Pemesan yang berisi seluruh tiket dalam transaksi. Jika booking expired, email notifikasi dikirim ke Email_Pemesan. Pengiriman email berjalan secara asinkron dan tidak mempengaruhi status booking.

#### Acceptance Criteria

1. WHEN booking berhasil dikonfirmasi oleh Payment_Gateway, THE Email_Service SHALL mengirimkan satu email konfirmasi dan e-tiket kepada Email_Pemesan; email ini berisi seluruh tiket yang dibeli dalam satu transaksi, dengan setiap tiket memuat: NIK_Attendee, kategori tiket, nomor bangku, dan QR code unik per tiket; pemesan bertanggung jawab meneruskan informasi tiket kepada masing-masing attendee.
2. WHEN TTL_Pembayaran habis dan booking dibatalkan setelah Grace_Period berakhir, THE Email_Service SHALL mengirimkan email pemberitahuan _expired_ kepada Email_Pemesan yang berisi kode booking dan nama event yang bersangkutan.
3. IF pengiriman email gagal pada percobaan pertama, THEN THE Email_Service SHALL melakukan _retry_ pengiriman secara otomatis maksimal 3 kali dengan interval 5 menit antar percobaan; IF semua percobaan gagal, THEN THE Email_Service SHALL menandai status email sebagai gagal permanen (_permanently failed_) tanpa memengaruhi status booking; buyer bertanggung jawab untuk meneruskan tiket secara manual kepada attendee yang email-nya gagal terkirim.
4. THE System SHALL memastikan kegagalan pengiriman email tidak membatalkan atau mengubah status booking yang sudah dikonfirmasi; status booking bersifat final terlepas dari keberhasilan pengiriman email.
5. THE Email_Service SHALL selalu memproses setiap permintaan pengiriman email secara asinkron; pemrosesan asinkron adalah invariant tetap dari Email_Service yang berlaku tanpa memandang apakah permintaan sedang aktif masuk atau tidak. Pada kondisi normal, Email_Service SHALL menyelesaikan pengiriman dalam waktu tidak lebih dari 5 menit setelah permintaan diterima.
6. WHEN Payment_Gateway mengirimkan callback "pembayaran berhasil" setelah Grace_Period berakhir dan booking sudah dibatalkan secara final (late success callback), THE Email_Service SHALL mengirimkan email notifikasi kepada Email_Pemesan yang menjelaskan bahwa: (a) pembayaran berhasil diterima, (b) booking sudah dibatalkan karena melewati batas waktu, (c) refund otomatis sedang diproses melalui Payment_Gateway; email ini HARUS dikirimkan dan bukan hanya dicatat di log internal.

7. WHEN e-tiket sudah siap di backend setelah pembayaran berhasil dikonfirmasi, THE Email_Service SHALL mengirimkan webhook notification ke endpoint yang dikonfigurasi (jika tersedia) dengan payload yang mencakup: booking_id, customer_email, ticket_count, dan timestamp; webhook ini memungkinkan integrasi dengan sistem eksternal (mis. CRM, analytics) untuk tracking distribusi e-tiket secara real-time; IF webhook endpoint tidak tersedia atau gagal diakses, THE Email_Service SHALL tetap melanjutkan pengiriman email tanpa menunggu respons webhook (fire-and-forget dengan retry 3×).

---

### Requirement 8: 🔒 Konsistensi dan Keamanan Stok

**User Story:** Sebagai operator sistem, saya ingin memastikan stok tiket tidak pernah _oversell_ meskipun ada ribuan transaksi bersamaan, sehingga setiap Customer yang berhasil membayar pasti mendapatkan tiket yang valid.

> **💡 Apa ini?** Sistem menjamin tidak ada overselling meskipun ribuan orang mencoba beli tiket yang sama secara bersamaan. Operasi "kunci tiket" (Hold) dilakukan secara atomik di level database. Ada background job yang membersihkan tiket yang terkunci tapi tidak dilanjutkan ke pembayaran.

#### Acceptance Criteria

1. WHEN dua atau lebih Customer mencoba melakukan Hold pada tiket yang tersisa secara bersamaan, THE Booking_Service SHALL memastikan hanya satu operasi Hold yang berhasil per unit stok melalui mekanisme _database-level atomic transaction_ dengan _row-level locking_ atau operasi _compare-and-swap_; Customer yang tidak berhasil SHALL menerima respons yang mengindikasikan bahwa tiket tidak tersedia; validasi kuota dan operasi Hold harus dieksekusi dalam satu transaksi atomik yang sama sehingga tidak ada celah _time-of-check-time-of-use_ (TOCTOU) antara kedua operasi tersebut.
2. THE Booking_Service SHALL memastikan jumlah tiket yang berstatus Held ditambah jumlah tiket yang berstatus Sold tidak pernah melebihi kapasitas stok yang tersedia untuk setiap kategori.
3. WHEN Hold dilepas (karena TTL_Booking habis, TTL_Pembayaran habis setelah Grace_Period, atau Customer membatalkan), THE Booking_Service SHALL mengembalikan unit stok yang dilepas ke pool Available sehingga jumlah stok Available bertambah tepat sebesar jumlah unit yang dilepas.
4. WHEN pembayaran berhasil dikonfirmasi dan stok yang bersangkutan berstatus Held, THE Booking_Service SHALL mengubah status stok dari Held menjadi Sold secara permanen; status Sold tidak dapat dikembalikan ke Available. Transisi ke Sold hanya diberlakukan untuk stok yang sebelumnya berstatus Held; stok dengan status lain di luar kondisi ini berada di luar cakupan requirement ini.
5. THE Booking_Service SHALL memastikan satu Customer hanya memegang satu slot aktif pada satu waktu untuk event yang sama.
6. IF Customer yang sudah memiliki slot aktif untuk sebuah event mencoba melakukan Hold tiket tambahan untuk event yang sama, THEN THE Booking_Service SHALL menolak permintaan tersebut dengan respons yang mengindikasikan bahwa Customer telah memiliki slot aktif untuk event tersebut, tanpa mengubah slot yang sudah ada.

7. THE Booking_Service SHALL menggunakan _database_ sebagai sumber kebenaran tunggal (_source of truth_) untuk stok tiket; Redis SHALL digunakan hanya sebagai _read cache_ untuk membaca stok secara cepat; WHEN terjadi inkonsistensi antara cache Redis dan database, THE Booking_Service SHALL mengacu pada nilai di database dan memperbarui cache Redis sesuai nilai tersebut.

8. THE Booking_Service SHALL menjalankan _background reaper job_ yang berjalan secara periodik (minimal setiap 1 menit) untuk mendeteksi Hold yang melewati waktu TTL-nya (termasuk Grace_Period) namun belum dilepas akibat kegagalan layanan; WHEN _reaper job_ mendeteksi Hold _orphaned_ tersebut, THE Booking_Service SHALL memaksa melepas Hold tersebut, mengembalikan stok ke pool Available, memberikan sinyal slot kosong ke Queue_Service, dan mencatat kejadian ini di _audit log_ untuk investigasi lebih lanjut.

9. THE Booking_Service SHALL memastikan transaksi Hold bersifat _all-or-nothing_ pada level multi-kategori: jika Customer memilih tiket dari beberapa kategori sekaligus, seluruh Hold harus berhasil atau seluruhnya dibatalkan; tidak diperbolehkan ada kondisi di mana sebagian kategori ter-Hold dan sebagian lainnya tidak dalam satu transaksi pembelian yang sama.

10. THE Booking_Service SHALL memastikan satu NIK_Attendee hanya dapat terikat ke satu tiket per event, berlaku lintas seluruh kategori tiket dan lintas seluruh Akun_Customer; validasi ini dilakukan terhadap seluruh booking aktif (status Hold, Sold, dan PENDING_DUKCAPIL_VALIDATION) untuk event yang sama tanpa pengecualian berdasarkan kategori; IF terjadi race condition di mana dua request mencoba menggunakan NIK yang sama untuk event yang sama secara bersamaan, THE Booking_Service SHALL memastikan hanya satu yang berhasil melalui mekanisme database-level constraint atau atomic transaction.

---

### Requirement 9: 🚀 Skalabilitas dan Ketahanan Sistem

**User Story:** Sebagai operator sistem, saya ingin sistem tetap beroperasi normal dan responsif saat terjadi lonjakan trafik ekstrem, sehingga pengalaman pengguna terjaga dan tidak ada downtime pada saat penjualan tiket dibuka.

> **💡 Apa ini?** Ruang tunggu (Waiting Room) bertindak sebagai "katup" yang mengatur berapa banyak Customer yang bisa masuk ke halaman pilih tiket sekaligus, melindungi server dari overload saat rush. Sistem bisa scale otomatis dalam 60 detik saat trafik melonjak.

#### Acceptance Criteria

1. WHILE sistem mengalami lonjakan trafik (_flash crowd_), THE Waiting_Room SHALL berfungsi sebagai _throttle_ yang membatasi jumlah Customer yang masuk ke Detail_Ticket_Page secara bersamaan pada ambang batas yang dikonfigurasi, sehingga Booking_Service tidak _overload_.
2. THE System SHALL mendukung _auto-scaling_ pada layer stateless (Home_Page, Waiting_Room, Payment_Page) dengan waktu _scale-up_ tidak lebih dari 60 detik sejak peningkatan beban terdeteksi, tanpa perubahan konfigurasi manual.
3. WHILE sistem berada di bawah beban tinggi (≥ 10× beban normal), THE Queue_Service SHALL memperbarui posisi antrian dengan latensi p95 kurang dari 1 detik.
4. WHILE sistem berada di bawah beban tinggi (≥ 10× beban normal), THE Home_Page SHALL merespons permintaan daftar event dengan latensi p95 kurang dari 1 detik.
5. IF satu layanan mengalami kegagalan (mis. Email_Service tidak tersedia), THEN THE System SHALL memastikan layanan lain tetap beroperasi secara penuh selama peningkatan latensi dan _error rate_ tidak melebihi 10% dibandingkan kondisi normal; ambang batas 10% adalah jaminan keras (_hard guarantee_) bahwa layanan lain dijamin tetap operasional selama degradasi tidak melampaui batas tersebut.
6. THE System SHALL menyediakan metrik operasional yang diperbarui setiap 10 detik atau kurang, mencakup: ukuran antrian aktif, laju konversi booking ke pembayaran, dan laju booking _expired_.

---

### Requirement 10: 🛡️ Keamanan Akses

**User Story:** Sebagai operator sistem, saya ingin memastikan Customer tidak dapat mengakses halaman Detail Ticket atau Payment tanpa melewati antrian yang sah, sehingga prinsip _fairness_ antrian terjaga dan tidak ada penyalahgunaan sistem.

> **💡 Apa ini?** Tidak ada jalan pintas untuk melewati antrian. Akses ke halaman pilih tiket dan pembayaran dijaga oleh token kriptografis yang unik per Customer. Data pembayaran sensitif tidak pernah menyentuh server sistem ini (PCI-DSS compliance via payment gateway).

#### Acceptance Criteria

1. IF Customer mencoba mengakses Detail_Ticket_Page tanpa Access_Token, THEN THE System SHALL menolak akses dengan respons HTTP 401 dan mengarahkan Customer ke Home_Page.
2. IF Customer mencoba mengakses Detail_Ticket_Page dengan Access_Token yang sudah kedaluwarsa atau dicabut, THEN THE System SHALL menolak akses dengan respons HTTP 403 dan pesan yang mengindikasikan token tidak lagi berlaku, lalu mengarahkan Customer ke Home_Page.
3. IF Customer mencoba mengakses Payment_Page dengan booking ID yang tidak valid atau dengan booking yang sudah dibatalkan atau sudah melewati TTL_Pembayaran, THEN THE Booking_Service SHALL menolak akses dengan respons HTTP 403 dan pesan yang mengindikasikan alasan penolakan, lalu mengarahkan Customer ke Home_Page.
4. THE System SHALL memastikan Access_Token dibangkitkan menggunakan generator acak kriptografis dengan entropi minimal 128 bit dan bersifat unik secara global di seluruh sistem.
5. THE System SHALL memastikan data pembayaran diproses melalui Payment_Gateway yang memenuhi standar PCI-DSS; THE System SHALL tidak menyimpan nomor kartu pembayaran atau data sensitif kartu secara langsung.
6. WHEN NIK_Attendee dimasukkan oleh Customer, THE Booking_Service SHALL memvalidasi bahwa NIK terdiri dari tepat 16 digit angka sebelum memproses data tersebut lebih lanjut.
7. IF NIK_Attendee tidak memenuhi format 16 digit angka, THEN THE Booking_Service SHALL menolak permintaan dengan pesan yang menyebutkan alasan penolakan secara spesifik tanpa mengungkapkan informasi sistem internal.
8. THE System SHALL mengizinkan akses ke Waiting_Room oleh Customer tamu (_guest_) tanpa login; namun THE System SHALL memastikan akses ke Detail_Ticket_Page (untuk operasi Hold / lanjut bayar) dan Payment_Page hanya dapat dilakukan oleh Customer yang telah menyediakan dan memverifikasi identitas (NIK 16 digit + email); IF Customer mencoba melanjutkan transaksi tanpa identitas tervalidasi, THEN THE System SHALL memblokir pelanjutan dan menampilkan form identitas (dengan parameter redirect agar Customer dapat langsung melanjutkan journey setelah identitas lengkap).
9. IF Customer mencoba memicu operasi Hold atau melanjutkan ke Payment_Page tanpa identitas (NIK + email) yang tervalidasi, THEN THE Booking_Service SHALL menolak permintaan tersebut dengan respons HTTP 422 (atau 403 sesuai konvensi API) beserta kode error yang menyatakan identitas belum lengkap/valid, tanpa melakukan Hold stok maupun membuat booking; THE System SHALL tetap mempertahankan Access_Token dan sesi Customer sehingga Customer dapat melengkapi identitas dan mencoba lagi selama TTL_Booking masih berlaku.

---

### Requirement 11: 📊 Observability Dashboard

**User Story:** Sebagai operator sistem dan CTO, saya ingin memiliki dashboard real-time yang menampilkan metrik operasional kunci, sehingga saya dapat memantau kesehatan sistem dan mengambil keputusan berbasis data saat event berlangsung.

> **💡 Apa ini?** Dashboard real-time untuk tim operasional dan CTO/CPO. Menampilkan: ukuran antrian, laju konversi (antrian → booking → bayar), jumlah tiket tersisa per kategori, dan metrik sistem. Data diperbarui setiap 10 detik.

#### Acceptance Criteria

1. THE System SHALL menyediakan web dashboard yang menampilkan metrik operasional secara real-time dengan pembaruan minimal setiap 10 detik.
2. THE Dashboard SHALL menampilkan metrik antrian yang mencakup: (a) queue depth per event (jumlah user dalam waiting room saat ini), (b) queue throughput (jumlah user yang keluar antrian per menit), (c) rata-rata waktu tunggu dalam antrian.
3. THE Dashboard SHALL menampilkan metrik konversi yang mencakup: (a) persentase konversi dari detail page ke payment page, (b) persentase konversi dari payment initiated ke payment success, (c) end-to-end funnel dari antrian sampai booking berhasil.
4. THE Dashboard SHALL menampilkan metrik expiry yang mencakup: (a) booking expiry rate (persentase booking yang tidak dibayar dalam TTL_Pembayaran), (b) jumlah booking expired per jam.
5. THE Dashboard SHALL menampilkan metrik stok yang mencakup: (a) jumlah tiket Available per kategori per event, (b) jumlah tiket dengan status Hold per kategori per event, (c) jumlah tiket Sold per kategori per event.
6. THE Dashboard SHALL menampilkan metrik sistem yang mencakup: (a) transactions per second, (b) error rate, (c) payment callback latency.
7. THE Dashboard SHALL dapat diakses oleh operator, tim teknis, dan manajemen (CTO/CPO) melalui URL terpisah yang tidak dapat diakses oleh Customer umum.
8. WHERE implementasi menggunakan tooling standar (mis. Grafana), THE System SHALL memastikan integrasi dengan structured logging dari backend untuk menghasilkan metrik yang diminta.
9. THE Dashboard SHALL menampilkan daftar booking **Disputed** beserta `order_id`, nominal pembayaran, dan timestamp untuk keperluan rekonsiliasi manual; operator dapat melihat detail dan menandai status refund setelah eksekusi manual di payment gateway.

---

### Requirement 12: 🤖 Anti-Bot Prevention

**User Story:** Sebagai operator sistem, saya ingin memastikan bahwa pengguna yang mengakses sistem adalah manusia organik, sehingga praktik pembelian otomatis menggunakan bot dapat dicegah dan tiket dapat dibeli secara adil oleh pengguna sebenarnya.

> **💡 Apa ini?** Sistem menerapkan 3 lapis pertahanan terhadap bot: (1) email verification saat daftar, (2) rate limiting saat masuk antrian, (3) pembatasan 1 Hold aktif per Customer. CAPTCHA hanya muncul jika terdeteksi pola mencurigakan — tidak mengganggu pengguna normal.

#### Acceptance Criteria

1. THE System SHALL menerapkan mekanisme anti-bot berlapis (defense in depth) yang mencakup layer registrasi, layer join antrian, dan layer detail ticket page.
2. WHEN Customer mendaftar akun, THE System SHALL menerapkan: (a) email verification via link sebagai barrier utama, (b) rate limiting maksimal 5 akun baru per IP address per jam; IF batas terlampaui, THE System SHALL menolak pendaftaran dengan pesan yang menyatakan terlalu banyak percobaan dari alamat IP tersebut.
3. WHEN Customer mencoba join antrian, THE System SHALL menerapkan: (a) rate limiting maksimal 3 request join queue per Akun_Customer (atau per Sesi_Pembelian tamu / identitas perangkat untuk guest) per menit, (b) pembatasan 1 posisi antrian aktif per Customer (akun maupun guest) per event, (c) untuk Customer tamu yang tidak melewati barrier registrasi berbasis IP (AC2), rate limiting berbasis IP address pada endpoint join antrian (ambang dikonfigurasi, mis. maksimal N join per IP per menit) sebagai pengganti barrier registrasi; IF Customer mencoba join antrian kedua untuk event yang sama, THE System SHALL menolak dengan pesan yang menyatakan sudah memiliki posisi antrian aktif.
4. WHILE Customer berada di Detail_Ticket_Page, THE System SHALL menerapkan: (a) pembatasan 1 Hold aktif per Customer (Akun_Customer maupun Sesi_Pembelian tamu) per event, (b) **CAPTCHA tak terlihat** (invisible CAPTCHA berbasis skor) yang berjalan tanpa interaksi user; token CAPTCHA diambil SEBELUM sale dibuka dan disegarkan berkala; tidak ada tantangan interaktif (puzzle/gambar) saat join kecuali skor sangat rendah; IF provider CAPTCHA tidak tersedia, THE System SHALL menerima request (fail-open) dan menyalakan alarm operasional.
5. WHEN percobaan akses ditolak karena melanggar aturan anti-bot (rate limiting, multiple queue join, atau pola mencurigakan), THE System SHALL mencatat detail percobaan tersebut ke dalam audit log untuk analisis lebih lanjut; logging bersifat conditional dan hanya terjadi pada saat violation attempt terdeteksi.
6. WHERE fitur device fingerprinting tersedia di fase production, THE System SHALL mempertimbangkan device fingerprint sebagai faktor tambahan dalam deteksi pola mencurigakan.

---

### Requirement 13: 🌐 Multi-Language Support

**User Story:** Sebagai Customer dari berbagai latar belakang, saya ingin dapat menggunakan sistem dalam bahasa yang saya pahami, sehingga saya dapat menyelesaikan proses pembelian tiket dengan lebih mudah.

> **💡 Apa ini?** Sistem tersedia dalam Bahasa Indonesia (default) dan Bahasa Inggris. Customer bisa toggle bahasa dari header. Preferensi tersimpan di browser. Terjemahan UI dan email template bisa di-release secara bertahap.

#### Acceptance Criteria

1. THE System SHALL menyediakan dukungan multi-bahasa untuk antarmuka pengguna dengan bahasa default Bahasa Indonesia.
2. THE System SHALL menyediakan toggle pemilihan bahasa (ID | EN) yang dapat diakses dari header pada setiap halaman.
3. WHEN Customer memilih bahasa, THE System SHALL menerapkan pilihan bahasa tersebut ke seluruh halaman dan menyimpan preferensi di localStorage browser sehingga pilihan tetap konsisten pada kunjungan berikutnya.
4. THE Multi-Language Support SHALL mencakup: (a) seluruh label UI pada frontend (tombol, form label, pesan error, placeholder), (b) template email (e-tiket dan notifikasi expired).
5. THE Backend SHALL mengembalikan error menggunakan error code (bukan teks hardcoded) sehingga frontend dapat menerjemahkan pesan error sesuai bahasa yang dipilih Customer.
6. THE System SHALL memastikan bahwa perubahan bahasa tidak mempengaruhi data transaksi (NIK, email, harga, dll) — hanya label dan pesan yang diterjemahkan.
7. THE Multi-Language Support SHALL dapat di-release secara incremental; fitur terjemahan frontend UI dan template email tidak harus selesai bersamaan; partial compliance diperbolehkan selama: (a) bahasa default (Bahasa Indonesia) selalu tersedia secara lengkap, (b) fitur yang sudah di-release dalam bahasa tertentu harus konsisten (tidak boleh setengah bahasa Indonesia setengah bahasa Inggris dalam satu halaman).

---

## Ringkasan Business Rules

> **Catatan untuk Stakeholder:** Business rules di bawah adalah aturan bisnis yang tidak dapat dikompromikan oleh tim teknis. Perubahan pada aturan ini memerlukan keputusan eksplisit dari CTO/CPO.

| ID | Aturan |
|---|---|
| BR-01 | Maksimal **3 tiket per transaksi** (bukan per NIK kumulatif). Satu transaksi boleh memuat kategori berbeda (mis. 1 Premium + 1 Festival + 1 VIP). Basis kuota adalah per transaksi, bukan per NIK. |
| BR-02 | Satu NIK_Terdaftar hanya dapat dikaitkan dengan satu Akun_Customer. Kuota 3 tiket per NIK per event diberlakukan lintas seluruh Sesi_Pembelian dan perangkat yang menggunakan akun tersebut. |
| BR-03 | TTL_Booking = **5 menit sejak slot diberikan** (`granted_at`), BUKAN sejak halaman dibuka. Jam booking mulai berjalan saat Admission Controller memberikan slot, bukan saat Customer membuka Detail_Ticket_Page. |
| BR-04 | Jika TTL_Booking habis: sesi booking batal → Hold stok (bila ada) dilepas → Access_Token dicabut → slot diberikan ke antrian berikutnya. |
| BR-05 | TTL_Pembayaran = 10 menit sejak booking dibuat (server-authoritative). Total waktu maksimum dari masuk Detail_Ticket_Page sampai selesai bayar adalah 15 menit (5 + 10). |
| BR-06 | Jika TTL_Pembayaran habis: status menjadi Pending_Cancellation → Grace_Period 30 detik dimulai → jika callback sukses tiba dalam grace period: booking dikonfirmasi → jika tidak: booking batal → stok dilepas → email expired dikirim → slot diberikan ke antrian berikutnya. |
| BR-07 | **Satu keterlibatan aktif per event** untuk customer login: Customer login hanya dapat memiliki satu posisi antrian ATAU satu booking aktif pada satu waktu untuk event yang sama. Setelah booking selesai (CONFIRMED atau CANCELLED), Customer boleh antre lagi dari posisi belakang. **TIDAK berlaku untuk tamu (guest)** — tamu tidak dibatasi oleh aturan ini. |
| BR-08 | Stok tiket yang sudah berstatus Sold bersifat final dan tidak dapat dikembalikan ke Available. Stok yang di-Hold tidak dapat dibeli oleh Customer lain. |
| BR-09 | **1 NIK = 1 Tiket = 1 Event**: satu NIK_Attendee hanya dapat terikat pada satu tiket untuk suatu event. Jika NIK sudah ada di booking apapun (Hold/Sold/PENDING_DUKCAPIL_VALIDATION) untuk event tersebut, NIK tersebut tidak dapat digunakan lagi di event yang sama oleh siapapun. Validasi dilakukan real-time on-blur dan sebagai final check saat submit. |
| BR-10 | Grace_Period = 30 detik setelah TTL_Pembayaran habis. Callback pembayaran sukses yang tiba dalam grace period masih diterima; setelah grace period berakhir, booking dibatalkan secara final dan callback sukses menjadi disputed. |
| BR-11 | Estimasi waktu tunggu menggunakan buffer konservatif +20% dari rata-rata laju pemrosesan 5 menit terakhir untuk mencegah under-promise (prinsip: lebih baik lebih cepat dari estimasi daripada lebih lambat). |
| BR-12 | NIK yang tercantum di tiket adalah NIK_Attendee (orang yang akan hadir dan duduk di bangku). Setiap tiket memiliki NIK_Attendee yang unik — tidak boleh ada dua tiket dalam satu event dengan NIK yang sama. Untuk registered user, NIK dari Daftar_NIK_Teman sudah terverifikasi dan dapat langsung digunakan. Untuk guest, semua NIK diverifikasi Dukcapil secara real-time. |
| BR-13 | E-tiket dan konfirmasi booking dikirim ke satu Email_Pemesan yang diisi saat pembelian. Seluruh tiket dalam satu transaksi dirangkum dalam satu email. Pemesan bertanggung jawab meneruskan informasi tiket kepada masing-masing attendee. |
| BR-14 | Session antrian dijaga di Backend (server-authoritative). Tab close, browser close, atau koneksi putus tidak melepas posisi antrian. Posisi hanya hilang dalam kondisi: (a) eksplisit batal + konfirmasi, (b) TTL_Booking habis setelah slot diberikan, (c) TTL_Pembayaran + grace habis, (d) pembayaran sukses. |
| BR-15 | Redirect ke Detail_Ticket_Page hanya terjadi jika Admission_Controller mengkonfirmasi ada slot tersedia (freeSlots > 0 AND availableTickets > 0). Posisi = 0 adalah syarat perlu tapi tidak cukup untuk redirect. |
| BR-16 | Mekanisme pengiriman update posisi antrian menggunakan Server-Sent Events (SSE), bukan adaptive polling. Keputusan ini didasarkan pada ADR-005 (24 Oktober 2026): SSE ~$14/event vs polling ~$300/event pada skala 300.000 concurrent user; SSE memenuhi NFR-06 p95 < 1 detik untuk semua posisi antrian (polling hanya memenuhi posisi ≤100). SSE Server dijalankan di ECS Fargate dengan Redis Pub/Sub untuk fan-out broadcast `now_serving` ke semua koneksi aktif. |
| BR-17 | **Session_TTL_Antrian DITOLAK**: Tidak ada TTL antrian absolut di POC. Posisi antrian hanya dilepas oleh: (a) TTL_Booking habis setelah slot diberikan, (b) TTL_Pembayaran + grace habis, (c) Customer eksplisit batal, (d) pembayaran sukses. Menutup tab tidak melepas posisi. |
| BR-18 | **Kode Error Standar API**: Booking_Service menggunakan kode error standar: `INSUFFICIENT_STOCK` (409), `QUOTA_EXCEEDED` (409), `HOLD_EXPIRED` (410), `INVALID_NIK_FORMAT` (400), `DUPLICATE_NIK_IN_REQUEST` (400), `NIK_ALREADY_USED` (409). Frontend menerjemahkan kode ke pesan lokal sesuai bahasa Customer. |
| BR-19 | Refund untuk booking **Disputed** (callback sukses tiba setelah booking dibatalkan final) **tidak otomatis** di POC — ditandai, dilaporkan di dashboard, dan dieksekusi manual melalui dashboard payment gateway. |
| BR-20 | **Sold out bersifat sementara**: kursi dari booking yang kedaluwarsa dijual kembali pada posisi antrian yang sama. Final setelah **930 detik** tanpa kemungkinan kursi kembali; setelah itu stream SSE ditutup dengan `410 Gone`. |
| BR-21 | **Pause admission**: Saat circuit breaker Dukcapil ATAU payment gateway OPEN (dependensi tidak dapat dipakai), admission di-pause — tidak ada grant baru dan tidak ada posisi antrian yang hilang. Berlaku sama untuk kedua dependensi. |
| BR-22 | **Pause TTL Grace**: Tenggat booking dan pembayaran yang sedang berjalan digeser **+60 detik** (`PAUSE_TTL_GRACE_SECONDS`) saat pause dimulai — bukan saat berakhir — agar gangguan sistem tidak memakan waktu customer. |

---

## State Tiket & Booking

```
[Stok Tersedia]
      |
      v
  AVAILABLE ──(Akses diberikan, masuk Detail_Ticket_Page, mulai TTL_Booking)──> SELECTING
      ^                                                                              |
      |                                                                              |
      ├──(TTL_Booking habis / idle, akses dilepas)───────────────────────────────────┘
      |
      └──(Grace_Period habis tanpa callback sukses, stok dilepas)── PENDING_CANCELLATION
                                                                          ^
                                                                          |
                                                    (TTL_Pembayaran habis, grace period dimulai)
                                                                          |
                                                                        HELD
                                                                          |
                                              (Pilih tiket & lanjut bayar,
                                               mulai TTL_Pembayaran 10 mnt)
                                                                          ^
                                                                          |
                                                                      SELECTING
                                                                          |
                                                          (Pembayaran sukses sebelum TTL
                                                           atau dalam Grace_Period)
                                                                          |
                                                                          v
                                                                        HELD
                                                                          |
                                                (Pembayaran sukses dikonfirmasi)
                                                                          |
                                                                          v
                                                                        SOLD
                                                                          |
                                                (E-tiket terbit ke Email_Pemesan)
                                                                          |
                                                                          v
                                                                       [Selesai]
```

**Transisi state lengkap:**
1. `AVAILABLE` → `SELECTING`: Access_Token valid, Customer mengakses Detail_Ticket_Page, TTL_Booking dimulai
2. `SELECTING` → `HELD`: Customer melanjutkan ke pembayaran dengan NIK_Attendee valid, Hold stok, TTL_Pembayaran dimulai
3. `SELECTING` → `AVAILABLE`: TTL_Booking habis atau Customer idle
4. `HELD` → `SOLD`: Payment_Gateway mengonfirmasi pembayaran berhasil (sebelum TTL atau dalam Grace_Period)
5. `HELD` → `PENDING_CANCELLATION`: TTL_Pembayaran habis, Grace_Period 30 detik dimulai
6. `PENDING_CANCELLATION` → `SOLD`: Callback pembayaran sukses tiba dalam Grace_Period
7. `PENDING_CANCELLATION` → `AVAILABLE`: Grace_Period berakhir tanpa callback sukses, booking dibatalkan

---

## Non-Functional Requirements

## Non-Functional Requirements — Ringkasan

> Persyaratan non-fungsional di bawah mendefinisikan **kualitas** sistem, bukan hanya fungsinya.

| Aspek | Target | Konteks |
|-------|--------|---------|
| **Kecepatan antrian** | < 1 detik (p95) | Saat beban 10× lebih tinggi dari normal |
| **Kecepatan home page** | < 1 detik (p95) | Saat traffic tinggi |
| **Scale-up otomatis** | Maks. 60 detik | Tanpa intervensi manual |
| **Uptime saat event berlangsung** | 99,95% | ~22 menit downtime/bulan |
| **Isolasi kegagalan** | Error rate ≤ 10% | Jika satu layanan mati, layanan lain tetap jalan |
| **Durabilitas antrian** | Survive restart | Posisi antrian tidak hilang jika server restart |
| **Keamanan token** | 128-bit entropy | Token akses tidak bisa ditebak |
| **Compliance pembayaran** | PCI-DSS via Gateway | Data kartu tidak pernah masuk server kami |
| **Kepatuhan privasi (UU PDP)** | Consent eksplisit + immutable record | Pemrosesan NIK pihak ketiga (teman) wajib ada persetujuan eksplisit sebelum disimpan |

---

| ID     | Kategori             | Requirement                                                                                                                                                                                                                                               |
| --------| ----------------------| -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| NFR-01 | Availability/UX      | WHILE beban puncak terjadi, THE Waiting_Room SHALL melindungi layanan inti dari _overload_ sehingga pengalaman pengguna tetap terjaga.                                                                                                                    |
| NFR-02 | Reliability          | WHILE Customer sudah mendapatkan Access_Token atau sudah membuat booking, THE System SHALL mempertahankan sesi dan Hold tersebut sepanjang TTL berlaku (termasuk Grace_Period untuk pembayaran) tanpa memutusnya secara sepihak.                          |
| NFR-03 | Scalability          | THE System SHALL mendukung _auto-scaling_ pada layer stateless untuk menangani lonjakan trafik _flash crowd_ yang jauh melebihi kapasitas tiket.                                                                                                          |
| NFR-04 | Consistency          | THE Booking_Service SHALL memastikan operasi Hold dan pengurangan stok bersifat atomik sehingga tidak terjadi _oversell_.                                                                                                                                 |
| NFR-05 | Fairness             | THE Queue_Service SHALL menjamin antrian bersifat _first-come-first-served_; posisi antrian tidak dapat dilangkahi oleh mekanisme apapun.                                                                                                                 |
| NFR-06 | Performance          | WHILE sistem berada di bawah beban tinggi, THE System SHALL memproses pembaruan posisi antrian dan permintaan daftar event dengan latensi p95 kurang dari 1 detik.                                                                                        |
| NFR-07 | Security             | THE System SHALL memproteksi akses ke Detail_Ticket_Page dan Payment_Page dengan Access_Token yang valid; data pembayaran diproses mengikuti standar PCI-DSS melalui Payment_Gateway.                                                                     |
| NFR-08 | Portability          | THE Payment_API SHALL menyediakan antarmuka REST/JSON yang identik untuk klien web dan mobile tanpa memerlukan perubahan pada backend.                                                                                                                    |
| NFR-09 | Observability        | THE System SHALL menyediakan metrik real-time mencakup ukuran antrian, laju konversi, laju booking expired, dan status stok (Available/Hold/Sold) untuk keperluan operasional melalui dashboard yang dapat diakses oleh tim internal.                     |
| NFR-10 | Resilience           | IF Email_Service atau layanan pendukung lainnya mengalami kegagalan, THEN THE System SHALL memastikan transaksi utama tetap valid dengan mekanisme _retry_ dan _dead-letter queue_ secara asinkron.                                                       |
| NFR-11 | Queue Durability     | THE Queue_Service SHALL menyimpan seluruh state antrian (Queue_Number, Now_Serving, token, timestamp) ke _persistent storage_ yang tahan terhadap restart layanan; _write_ ke storage harus diselesaikan sebelum posisi antrian dikonfirmasi ke Customer. |
| NFR-12 | Internationalization | THE System SHALL mendukung multi-bahasa (minimal Bahasa Indonesia dan English) untuk antarmuka pengguna dan template email.                                                                                                                               |
| NFR-13 | Anti-Abuse           | THE System SHALL menerapkan mekanisme rate limiting dan anti-bot pada titik-titik kritis (registrasi, join antrian, checkout) untuk mencegah penyalahgunaan oleh bot atau pengguna tidak sah.                                                             |
| NFR-14 | Privacy Compliance   | THE System SHALL memastikan pemrosesan data pribadi pihak ketiga (NIK teman) mematuhi UU PDP No. 27 Tahun 2022: persetujuan eksplisit sebelum pemrosesan, consent record yang immutable, tujuan pemrosesan yang spesifik, dan mekanisme pencabutan persetujuan melalui tim operasional. |
