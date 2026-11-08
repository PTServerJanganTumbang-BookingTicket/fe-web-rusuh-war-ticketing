# ADR-0025: Perbandingan Metode Autentikasi — Magic Link vs OTP vs Password

- **Status**: Proposed
- **Tanggal**: 2026-11-08
- **Pengambil keputusan**: Tim FE Web, BE, dan Product
- **Requirement terkait**: FR-29 (Login), FR-30 (Register), FR-31 (Verifikasi email), BR-07 (Login opsional), BR-09 (Redirect setelah login), NFR-05 (Keamanan), [ADR-0023](0023-passwordless-login-email.md)

## Konteks

Aplikasi Rusuh Booking Tiket membutuhkan mekanisme autentikasi untuk:
- **Registrasi**: verifikasi identitas dan email pengguna baru
- **Login**: mengautentikasi pengguna yang sudah terdaftar

Karakteristik khusus aplikasi yang mempengaruhi keputusan:
1. **Flash crowd / high-traffic**: ribuan user login bersamaan saat penjualan dibuka
2. **Login opsional** (BR-07): tamu bisa booking tanpa akun, akun hanya untuk fitur tambahan (NIK teman, riwayat tiket, pemulihan lintas perangkat)
3. **WebView mobile**: aplikasi mobile meng-embed web untuk pembayaran
4. **Target user non-teknis**: proses harus simpel, tidak boleh membingungkan

Dokumen ini membandingkan tiga metode autentikasi untuk mendasari keputusan di [ADR-0023](0023-passwordless-login-email.md).

---

## Opsi yang Dipertimbangkan

### Opsi 1: Magic Link (Email-based Passwordless)

**Cara kerja:**
1. User memasukkan email
2. Backend mengirim email berisi link dengan token sekali pakai
3. User klik link → backend memverifikasi token → session dibuat
4. Token hangus setelah dipakai atau expired

**Kelebihan:**

| Aspek | Detail |
|-------|--------|
| **Keamanan tinggi** | Tidak ada password untuk dicuri, di-crack, atau di-reuse di site lain |
| **Eliminasi credential stuffing** | Attacker tidak bisa pakai database password bocor karena tidak ada password |
| **Eliminasi brute force tradisional** | Tidak ada password untuk ditebak |
| **Token sekali pakai** | Link hangus setelah digunakan, tidak bisa di-replay |
| **Waktu hidup singkat** | Token expired dalam 5-15 menit, mengurangi window of attack |
| **Phishing resistance** | Lebih sulit di-phish karena token terikat ke email yang benar |
| **UX simpel untuk user** | Tidak perlu mengingat atau membuat password |
| **Tidak perlu password recovery** | Tidak ada "lupa password" flow yang kompleks |
| **Verifikasi email otomatis** | Email terverifikasi sebagai bagian dari proses login |
| **Cocok untuk jarang login** | Ideal untuk app yang user-nya tidak login setiap hari |

**Kekurangan:**

| Aspek | Detail |
|-------|--------|
| **Email delivery dependency** | Bergantung pada kecepatan email provider |
| **Email delay saat peak** | Saat flash sale, email mungkin delay karena volume tinggi |
| **Email account compromise** | Jika email user dibobol, akun app ikut terbobol |
| **Email scanner burn token** | Beberapa email client/antivirus membuka link untuk scan, bisa hanguskan token sebelum user klik |
| **Cross-device friction** | Link hanya bisa dipakai di device yang membuka email (masalah jika buka email di HP tapi mau login di laptop) |
| **Tidak bisa offline** | Butuh akses email untuk login |
| **Email deliverability** | Email bisa masuk spam folder |
| **UX friction** | User harus buka app email → cari email → klik link (lebih banyak langkah dari password) |

**Mitigasi kekurangan:**
- Email scanner: gunakan `POST` dengan confirmation screen, bukan `GET` langsung (ADR-0023 usulan #2)
- Cross-device: sediakan fallback kode manual yang bisa diketik
- Spam: gunakan email provider dengan reputasi baik, setup SPF/DKIM/DMARC

---

### Opsi 2: OTP (One-Time Password via SMS atau Email)

**Cara kerja:**
1. User memasukkan email/nomor HP
2. Backend mengirim kode 6 digit via SMS atau email
3. User ketik kode di app → backend memverifikasi → session dibuat
4. Kode expired setelah beberapa menit

**Kelebihan:**

| Aspek | Detail |
|-------|--------|
| **Passwordless** | Sama seperti magic link, tidak ada password untuk dicuri |
| **Familiar bagi user** | Mayoritas user sudah terbiasa dengan OTP (banking, e-commerce) |
| **Cross-device friendly** | Kode bisa diketik manual di device manapun |
| **SMS instant** | SMS biasanya lebih cepat dari email |
| **Tidak perlu buka app lain** | Kode bisa di-copy dari notification tanpa buka app email |
| **Mobile-first UX** | Autofill OTP dari SMS sudah standar di iOS dan Android |
| **Fallback option** | Bisa kombinasi SMS + email untuk redundansi |

**Kekurangan:**

| Aspek | Detail | Severity |
|-------|--------|----------|
| **SIM swapping** | Attacker bisa clone nomor HP user via social engineering ke operator | **CRITICAL** |
| **SS7 vulnerability** | Protocol SMS (SS7) punya kelemahan yang memungkinkan intercept | **HIGH** |
| **Brute force window** | 6 digit = 1.000.000 kombinasi, perlu rate limiting sangat ketat | **HIGH** |
| **SMS cost** | SMS berbayar per pesan, mahal untuk volume tinggi | **MEDIUM** |
| **SMS delivery unreliable** | SMS bisa delay atau gagal, terutama di daerah sinyal lemah | **MEDIUM** |
| **Phishing** | User bisa ditipu memberikan OTP ke site palsu (real-time phishing) | **HIGH** |
| **Nomor HP berubah** | User ganti nomor → kehilangan akses akun | **MEDIUM** |
| **International SMS** | SMS internasional mahal dan sering gagal | **MEDIUM** |
| **Regulatory** | Beberapa negara punya regulasi ketat soal SMS marketing/transaksional | **LOW** |

**Detail ancaman SIM Swapping:**
```
Attack flow:
1. Attacker dapat informasi personal victim (dari social media, data breach)
2. Attacker hubungi operator telekomunikasi, berpura-pura jadi victim
3. Attacker minta transfer nomor ke SIM baru
4. Operator (dengan social engineering) melakukan transfer
5. Attacker terima semua SMS victim, termasuk OTP
6. Attacker login ke semua akun yang pakai SMS OTP
```

**Detail ancaman SS7:**
```
SS7 (Signaling System 7) adalah protocol yang menghubungkan jaringan telekomunikasi.
Kelemahan:
- Tidak ada authentication antar node
- Attacker dengan akses ke jaringan telco bisa intercept SMS
- Documented attacks sejak 2014
- Tidak ada fix karena backward compatibility
- Banyak negara sudah melarang SMS OTP untuk banking
```

**Mitigasi kekurangan:**
- SIM swap: sulit dimitigasi dari sisi app, tergantung operator
- Brute force: rate limit ketat (3-5 attempt), exponential backoff, CAPTCHA setelah gagal
- Phishing: edukasi user, tapi tidak efektif

---

### Opsi 3: Username dan Password Tradisional

**Cara kerja:**
1. Registrasi: user buat username/email dan password
2. Login: user masukkan credentials → backend hash dan compare → session dibuat
3. Password disimpan sebagai hash di database

**Kelebihan:**

| Aspek | Detail |
|-------|--------|
| **Familiar** | Mayoritas user sudah terbiasa dengan username/password |
| **Instant** | Tidak perlu tunggu email atau SMS |
| **Offline-capable** | Credentials tersimpan, tidak perlu akses email untuk login |
| **User control** | User bisa pilih password sendiri |
| **No delivery dependency** | Tidak bergantung pada email/SMS provider |
| **Cross-device** | Bisa login dari device manapun |
| **Cheap** | Tidak ada cost per login (tidak seperti SMS) |

**Kekurangan:**

| Aspek | Detail | Severity |
|-------|--------|----------|
| **Password reuse** | 65% user pakai password sama di multiple sites (Google study 2019) | **CRITICAL** |
| **Credential stuffing** | Attacker pakai database password bocor untuk login massal | **CRITICAL** |
| **Brute force** | Password lemah bisa ditebak dalam hitungan jam | **HIGH** |
| **Phishing** | User tertipu ketik password di site palsu | **HIGH** |
| **Rainbow table** | Tanpa salt yang benar, hash bisa di-reverse lookup | **HIGH** |
| **Password storage liability** | Backend harus simpan hash dengan benar (bcrypt/argon2) | **HIGH** |
| **Weak password** | User pilih password lemah (123456, password, tanggal lahir) | **HIGH** |
| **Password fatigue** | User capek mengingat banyak password | **MEDIUM** |
| **Recovery complexity** | Perlu "lupa password" flow yang aman | **MEDIUM** |
| **Social engineering** | Support bisa ditipu untuk reset password | **MEDIUM** |

**Statistik kebocoran password:**
- 2024: lebih dari 10 miliar password records bocor
- Top 3 password global 2024: "123456", "password", "123456789"
- 81% data breaches melibatkan weak atau stolen passwords (Verizon DBIR)

**Mitigasi kekurangan:**
- Brute force: rate limiting, account lockout, CAPTCHA
- Weak password: password policy (min length, complexity), check against breach database
- Phishing: 2FA/MFA (tapi ini menambah friction)
- Storage: bcrypt atau Argon2id dengan cost factor tinggi

**Catatan: Password + 2FA**
Menambahkan 2FA (OTP atau TOTP) ke password meningkatkan keamanan signifikan, tapi:
- Menambah friction (2 langkah)
- OTP via SMS tetap punya kelemahan SIM swap
- TOTP (Google Authenticator) butuh setup dan device-dependent
- Recovery jadi lebih kompleks jika kehilangan 2FA device

---

## Matriks Perbandingan

| Kriteria | Magic Link | OTP (SMS) | OTP (Email) | Password | Password + SMS 2FA | Password + TOTP |
|----------|:----------:|:---------:|:-----------:|:--------:|:-----------------:|:---------------:|
| **Security Score** | ⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **UX Simplicity** | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐ |
| **Implementation Cost** | Low | High | Low | Medium | High | Medium |
| **Operational Cost** | Low | High | Low | Low | High | Low |
| **Credential Stuffing Risk** | None | None | None | High | Medium | Low |
| **SIM Swap Risk** | None | **Critical** | None | None | **Critical** | None |
| **Phishing Risk** | Low | High | Medium | High | Medium | Low |
| **Delivery Dependency** | Email | SMS | Email | None | SMS | None |
| **Cross-device** | Friction | Easy | Friction | Easy | Easy | Device-bound |
| **Offline Login** | No | No | No | Yes | No | Partial |
| **Password Recovery Needed** | No | No | No | Yes | Yes | Yes |

---

## Analisis untuk Konteks Rusuh Booking Tiket

### Pertimbangan khusus:

1. **Flash crowd scenario**: Saat penjualan dibuka, ribuan user login bersamaan
   - Magic Link: email delay bisa jadi bottleneck
   - OTP SMS: cost tinggi, delivery bisa unreliable
   - Password: instant, tidak ada delivery dependency
   - **Mitigasi**: Login opsional (BR-07) — user bisa booking tanpa akun

2. **Target user non-teknis**: mayoritas user awam
   - Password + TOTP terlalu kompleks
   - Magic link dan OTP familiar dari e-commerce

3. **Mobile-first**: mayoritas akses dari HP
   - SMS OTP punya autofill native
   - Magic link bisa awkward (buka email app → klik link → kembali ke app)

4. **Nilai akun**: akun menyimpan NIK (data sensitif) dan riwayat tiket
   - Keamanan penting, tapi bukan level banking
   - Trade-off antara security dan UX bisa lebih relaks

5. **Login jarang**: user tidak login setiap hari
   - Password akan dilupakan
   - Magic link cocok untuk pattern ini

---

## Mengapa Magic Link adalah Pilihan Terbaik untuk Use Case Ini

### 1. Login Opsional adalah Game Changer

Kelemahan terbesar Magic Link — **email delay saat flash crowd** — dimitigasi oleh BR-07:

> User bisa antre dan booking sebagai TAMU tanpa login.
> Login hanya untuk: NIK Teman tersimpan, riwayat tiket, pemulihan lintas perangkat.

Implikasinya:
- Saat penjualan dibuka → user antre sebagai tamu → **tidak ada bottleneck email**
- Login bisa dilakukan kapan saja setelah situasi tenang
- Yang butuh login saat flash sale hanya user yang sudah punya akun dan ingin NIK teman terisi otomatis

### 2. Pattern "Jarang Login" Cocok dengan Magic Link

| Karakteristik | Implikasi untuk Password | Implikasi untuk Magic Link |
|---------------|--------------------------|----------------------------|
| User beli tiket mungkin 2-3x setahun | Password akan dilupakan | Tidak perlu mengingat apapun |
| Tidak ada aktivitas harian | Tidak ada muscle memory untuk password | Flow tetap sama setiap kali |
| Akun bukan aset utama | User tidak akan invest effort untuk password kuat | Keamanan tidak bergantung pada effort user |

Password tradisional **buruk** untuk pattern ini — user akan:
- Pakai password lemah yang mudah diingat
- Pakai password sama dengan site lain
- Selalu klik "lupa password" → yang pada dasarnya... magic link juga

### 3. Threat Model Comparison

| Ancaman | Magic Link | Password | OTP SMS |
|---------|:----------:|:--------:|:-------:|
| Credential stuffing (database bocor) | ✅ Immune | ❌ Rentan | ✅ Immune |
| Password reuse attack | ✅ Immune | ❌ Rentan | ✅ Immune |
| SIM swapping | ✅ Immune | ✅ Immune | ❌ **CRITICAL** |
| Email compromise | ❌ Rentan | ✅ Immune* | ✅ Immune |
| Phishing real-time | ✅ Sulit | ❌ Mudah | ❌ Mudah |

*Password immune ke email compromise **hanya jika tidak ada "lupa password" flow** — yang tidak realistis.

**Realitanya:** Jika email user dibobol, attacker tetap bisa reset password di sistem password tradisional. Jadi kerentanan email itu sama saja.

### 4. Cost-Benefit Analysis

| Metode | Implementation Cost | Operational Cost | Security ROI |
|--------|:-------------------:|:----------------:|:------------:|
| Magic Link | Low | Low (email murah) | High |
| Password | Medium (hashing, recovery) | Low | Low |
| OTP SMS | Low | **High** (SMS berbayar) | Medium |
| Password + 2FA | High | Medium-High | High |

Magic Link memberikan **security setara Password+2FA** dengan **cost dan complexity jauh lebih rendah**.

### 5. Kelemahan yang Perlu Diaddress: Cross-Device Friction

**Cross-device friction** adalah kelemahan nyata:

```
Scenario: User buka email di HP, tapi mau login di laptop
- Klik link di HP → session di HP, bukan laptop
- Harus forward email atau request ulang
```

**Solusi:** Tambahkan **fallback kode 6 digit** yang bisa diketik manual.

```
Email berisi:
1. Tombol "Login Sekarang" (magic link)
2. Atau ketik kode: 847293 (berlaku 10 menit)
```

Ini memberikan best of both worlds:
- Magic link untuk flow utama (1 klik)
- Kode manual untuk cross-device scenario

### 6. Kapan Magic Link BUKAN Pilihan Tepat (Tidak Berlaku untuk App Ini)

Magic Link tidak cocok jika:
1. **Login harus instant** — app yang user login berkali-kali sehari (social media, productivity)
2. **Offline login dibutuhkan** — app yang harus jalan tanpa internet
3. **Email tidak reliable** — target user di daerah dengan internet tidak stabil
4. **High-value accounts** — banking, crypto (butuh 2FA hardware)

Untuk Rusuh Booking Tiket, **tidak satupun kondisi di atas berlaku**.

### 7. Summary: Mengapa Magic Link Menang

| Faktor | Penilaian |
|--------|-----------|
| Security vs Password | ✅ Jauh lebih baik |
| Security vs OTP SMS | ✅ Lebih baik (no SIM swap) |
| UX untuk user jarang login | ✅ Lebih baik dari password |
| Flash crowd handling | ✅ Dimitigasi oleh login opsional |
| Implementation cost | ✅ Rendah |
| Operational cost | ✅ Rendah |

---

## Keputusan

**Magic Link dipilih** sebagai metode autentikasi utama dengan pertimbangan:

1. **Keamanan lebih tinggi dari password tradisional** tanpa kompleksitas 2FA
2. **Mengeliminasi risiko credential stuffing** yang merupakan ancaman terbesar untuk web app
3. **Tidak ada SIM swap risk** seperti SMS OTP
4. **Sesuai dengan pattern "jarang login"** aplikasi ticketing
5. **Login opsional (BR-07)** memitigasi masalah email delay saat flash sale
6. **Implementasi dan operational cost rendah** dibanding SMS

### Keputusan turunan:

1. Token dikirim via email, bukan SMS
2. Token disimpan di `httpOnly` cookie setelah verifikasi (ADR-0023)
3. Link membuka confirmation screen, verifikasi via `POST` (hindari email scanner burn)
4. Fallback: kode 6 digit yang bisa diketik manual untuk cross-device scenario
5. Token validity: 10 menit
6. Resend cooldown: 60 detik
7. Max resend: 3 kali per session

---

## Konsekuensi

**Positif:**
- Tidak ada password untuk dicuri, di-crack, atau di-reuse
- Email terverifikasi sebagai bagian dari proses
- UX simpel untuk user non-teknis
- Tidak ada biaya SMS
- Recovery flow tidak diperlukan

**Negatif / biaya:**
- User yang perlu login ulang saat flash sale bergantung pada kecepatan email
- Cross-device login membutuhkan fallback (kode manual)
- Email deliverability harus dijaga (SPF, DKIM, DMARC, warm-up IP)
- Perlu monitoring bounce rate dan spam classification

**Yang harus dijaga:**
- Rate limit untuk request magic link: max 3 per email per 5 menit
- Token expiry enforced di backend
- Logging untuk audit: siapa request, kapan, dari IP mana
- Email template tidak boleh ada link lain selain CTA utama (hindari confusion)
- Monitor email delivery metrics (bounce, spam, open rate)
- Test Playwright: pastikan flow magic link end-to-end works

---

## Referensi

1. NIST SP 800-63B: Digital Identity Guidelines - Authentication
2. OWASP Authentication Cheat Sheet
3. Google Security Blog: "New research: How effective is basic account hygiene at preventing hijacking" (2019)
4. Verizon Data Breach Investigations Report (DBIR) 2024
5. Have I Been Pwned Statistics
6. SS7 Protocol Vulnerabilities - GSMA Documentation

---

## Pertanyaan Terbuka

| # | Pertanyaan | Pemilik |
|---|------------|---------|
| 1 | Apakah perlu fallback kode manual untuk cross-device? | Product, UX |
| 2 | Berapa lama token validity yang optimal? (5, 10, 15 menit) | BE, Security |
| 3 | Email provider apa yang akan digunakan? (SendGrid, SES, Mailgun) | DevOps |
| 4 | Apakah perlu monitoring khusus untuk email deliverability? | DevOps |
