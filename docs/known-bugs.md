# Bug Diketahui yang Belum Diperbaiki

Hasil audit baca-kode 2026-11-13 (alur queue, booking, payment, auth gateway). Semua butir di bawah belum diverifikasi di
backend asli kecuali dinyatakan lain. Butir yang sudah diperbaiki di audit yang sama tidak dicantumkan; lihat riwayat git
dan [`.kiro/usage-log.md`](../.kiro/usage-log.md).

Hapus butir dari daftar ini saat diperbaiki, di commit yang sama dengan perbaikannya.

## Queue

| # | Masalah | Lokasi | Dampak dan arah perbaikan |
|---|---|---|---|
| Q1 | Hasil refetch `join` hampir tidak dipakai: stream SSE dan posisi tidak ikut tiket baru; galat `SALE_CLOSED`, `FULL_BOOKED`, `QUEUE_FULL` kalah oleh data `waiting` lama di cache | `queue.queries.ts`, `queue.controller.ts`, `queue.mapper.ts` (`toQueueGone`) | Layar waiting basi untuk sale yang sudah tutup. Kunci stream dan posisi ke `ticketNo`/`streamUrl`; `setQueryData` saat join sukses; `toQueueGone` memperhitungkan `join.error` walau ada data lama |
| Q2 | Join 401 tidak punya pemetaan sesi akun (jadi `unknown`, lalu diulang sekali termasuk captcha); 403 selalu `CAPTCHA_FAILED` | `http-queue.service.ts` (`errorCodes` join) | Sesi akun habis tampil "unknown". Petakan 401 ke kode sesi habis; bedakan 403 lewat `meta.error_code` |
| Q3 | Leave bisa membuat tiket baru: `forgetQueue` menghapus tiket, tetapi observer polling yang masih aktif memanggil `getState` yang jatuh ke `joinServer` | `queue.controller.ts`, `http-queue.service.ts` | Perlu diuji dulu (keyakinan sedang). `cancelQueries` sebelum menghapus; `getState`/`getOwnState` melempar `QUEUE_TOKEN_INVALID` alih-alih join diam-diam |
| Q4 | `joinServer` selalu menyimpan `ratePerMin: 0` sehingga ETA kembali "menghitung" setelah rejoin | `http-queue.service.ts` | Pertahankan rate lama bila `ticketNo` sama |
| Q5 | Widget Turnstile `interaction-only` dirender di kontainer 0x0 tersembunyi | `turnstile-captcha.service.ts` | Bila Turnstile minta interaksi, tantangan tak terlihat dan habis waktu 15 detik jadi `CAPTCHA_FAILED`. Tampilkan kontainer saat callback interaktif. Keyakinan rendah, bergantung perilaku produksi |
| Q6 | `useLiveUpdates`: `stop` mereferensikan `unsubscribe` sebelum ditetapkan | `live-updates` hook | Hanya meledak bila `watch` memanggil `next` sinkron. Laten, tidak terjadi hari ini |

## Booking

| # | Masalah | Lokasi | Dampak dan arah perbaikan |
|---|---|---|---|
| B1 | `aliasPicks` slot yang sudah dihapus tetap di state, jadi opsi pemilik tampil "dipakai tiket lain" di slot yang tersisa | `booking.controller.ts` (`changeSelection`), `booking.mapper.ts` | Hapus entri `niks`, `aliasPicks`, `checks` untuk slot yang hilang, atau saring `picks` ke slot aktif di mapper |
| B2 | Hasil Dukcapil lama tetap membuka modal "Periksa NIK" walau NIK di kolom sudah berubah atau slotnya sudah dihapus | `booking.controller.ts` (cek NIK, `.then`) | Baca NIK slot saat ini lewat ref; lewati modal bila beda atau slot hilang |

## Payment

| # | Masalah | Lokasi | Dampak dan arah perbaikan |
|---|---|---|---|
| P1 | Masa tenggang tidak punya batas lokal: polling terus 3 detik sampai server menjawab PAID, EXPIRED, atau 401 | `payment.controller.ts` | Bila server tidak pernah menjawab final, layar "memverifikasi" tidak berakhir. Tambah batas sekitar 30 detik lalu tanya server sekali lagi |
| P2 | Poll status dan GET booking tidak memetakan kode galat server (sengaja, agar 409 tidak menghentikan polling) | `http-order.service.ts` | Galat bisnis pada poll tetap `unknown`. Perlu desain terpisah bila ingin ditampilkan |

## Auth gateway dan sesi

| # | Masalah | Lokasi | Dampak dan arah perbaikan |
|---|---|---|---|
| A1 | Permintaan yang tiba setelah refresh pertama selesai, masih membawa refresh token lama, ditolak BE dan cookie dihapus | `account-gateway.service.ts` (`forward`) | Sesi terhapus acak di akun dengan banyak permintaan paralel yang tidak serentak. Butuh cache singkat token hasil rotasi; bentrok dengan test "token refresh dipakai ulang mengakhiri sesi", jadi perlu keputusan |
| A2 | Rute yang membolehkan tamu (`queue/me`, `/tickets`) me-refresh dan merotasi token pada tiap poll bila grant 401 tetapi token akun valid | `account-gateway.service.ts` | Rotasi token berlebihan. Lewati refresh bila akun tidak diperlukan |
| A3 | `GET /auth/login?token=` menukar token sekali pakai langsung | `account-gateway.service.ts` (`verifyLink`), `app/auth/login/route.ts` | Pemindai email bisa menghanguskan token. Alihkan ke halaman konfirmasi seperti `verify-email`. Keyakinan sedang, bergantung semantik BE |
| A4 | Gateway same-origin tidak meneruskan IP klien | `account-gateway.service.ts` (`forward`, `forwardAuth`) | Bila BE membatasi per IP peer, semua pengguna berbagi satu bucket (`rl:join:{ip}` 20 per 5 menit). Teruskan `x-forwarded-for`; konfirmasi BE mempercayai proxy |
| A5 | `/api/session/start` menerima body apa pun, `proxy.ts` hanya memeriksa keberadaan cookie | `app/api/session/start/route.ts`, `proxy.ts` | Hanya cangkang UI yang terbuka (BE tetap memvalidasi grant). Sudah bertanda "SEMENTARA"; selesai saat verifikasi JWT di edge ada |

## Infrastruktur HTTP

| # | Masalah | Lokasi | Dampak dan arah perbaikan |
|---|---|---|---|
| H1 | `fetch-http.client.ts` tanpa timeout atau `AbortSignal` | `src/core/data/http/fetch-http.client.ts` | BE yang menggantung menahan query tanpa batas. Tambah timeout per permintaan |
| H2 | Respons 204 diparse dengan `schema.parse(undefined)` | sama | Melempar `ZodError` mentah, bukan `AppFailure`, untuk skema selain `z.unknown()` |
