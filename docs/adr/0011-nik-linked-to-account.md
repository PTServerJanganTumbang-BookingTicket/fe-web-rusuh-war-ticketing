# ADR-0011: NIK terikat ke akun, terisi otomatis, kuota 3 tiket ditegakkan server

- **Status**: Proposed
- **Tanggal**: 2026-10-19
- **Pengambil keputusan**: Tim FE Web dan BE, perlu dikonfirmasi klien
- **Requirement terkait**: Login wajib sebelum antre (jawaban klien), FR-11–19 (Detail Ticket, NIK dan kuota), BR-01–04, [ADR-0002](0002-layered-clean-architecture.md), [ADR-0009](0009-contract-first-openapi-msw.md), [ADR-0010](0010-login-single-session-progress-persistence.md)

## Konteks

Detail Ticket mewajibkan NIK dan membatasi maksimal 3 tiket per NIK per event, dihitung bersama booking aktif. Rancangan awal membuat customer mengetik NIK di setiap booking. Karena login sudah wajib, NIK bisa menjadi atribut akun. Pertanyaannya: dari mana NIK berasal, dan siapa yang menegakkan batas 3.

## Opsi yang dipertimbangkan

1. **NIK diketik per booking (rancangan awal).** Fleksibel, tetapi satu orang bisa mengetik NIK berbeda untuk melewati batas, validasi bergantung pada input manual, dan NIK tidak terhubung ke identitas login.
2. **NIK terikat akun, bisa diubah saat booking.** Menghilangkan kerja mengetik, tetapi tetap membuka celah mengganti NIK untuk melewati batas.
3. **NIK terikat akun, terisi otomatis dan tidak bisa diubah di Detail Ticket.** Batas 3 menempel pada identitas akun. Formulir lebih pendek.

## Keputusan

**Opsi 3.**

- **NIK dimiliki akun dan disimpan di BE.** FE membacanya dari profil (`GET /me`), tidak menyimpannya sendiri. Satu NIK hanya boleh terhubung ke satu akun. Aturan ini ditegakkan BE, supaya batas 3 tidak bisa dilewati dengan banyak akun.
- **Detail Ticket menampilkan NIK terisi otomatis dan hanya-baca**, dalam bentuk tersamar (mis. `3174••••••••0001`). Tidak ada field NIK yang bisa diketik di alur booking.
- **Batas 3 tiket per NIK per event ditegakkan BE.** Ini penentu akhir, dan `QUOTA_EXCEEDED` saat submit tetap dipetakan ke pesan inline dengan sisa kuota.
- **FE hanya menampilkan dan membatasi tombol tambah** lewat `canAddTicket` di `core`. Angka `activeBooked` datang dari BE (mis. `quota: { max, used, remaining }` pada sesi booking), FE tidak menghitung sendiri dari riwayat yang ia ketahui. Ini juga membuat kuota tetap benar setelah pindah perangkat (ADR-0010).
- **Kuota habis** (`remaining = 0`): tombol tambah nonaktif dan layar menjelaskan alasannya, tanpa menyembunyikan booking aktif yang sudah ada.
- **Akun tanpa NIK valid** tidak bisa masuk Detail Ticket. Layar mengarahkan ke pelengkapan profil. `NIK_INVALID` berlaku untuk kasus ini, bukan untuk input per booking.
- **NIK adalah data pribadi.** NIK tidak boleh ada di URL, query key, `localStorage`, Context, atau log. Selalu tampil tersamar kecuali ada kebutuhan eksplisit.

### Kontrak yang diminta dari BE

| Kebutuhan | Keterangan |
|---|---|
| `GET /me` | Mengembalikan NIK tersamar dan status kelengkapan profil, bukan NIK utuh bila tidak perlu |
| NIK unik lintas akun | Satu NIK hanya satu akun |
| Kuota pada sesi booking | `quota: { max: 3, used, remaining }`, dihitung dari booking aktif dan tiket terbayar untuk event tersebut |
| Penegakan batas 3 | Saat submit, atomik terhadap booking paralel dari NIK yang sama |

## Konsekuensi

- **Positif**: batas 3 menempel pada identitas, bukan pada input yang bisa diganti. Formulir Detail Ticket lebih pendek dan tidak ada salah ketik NIK. Kuota konsisten lintas perangkat.
- **Negatif / biaya**: BE harus menyimpan dan menjamin keunikan NIK per akun, dan harus ada jalur untuk melengkapi atau memperbaiki NIK (pendaftaran atau profil). Akun yang salah NIK tidak bisa memperbaikinya di tengah booking.
- **Yang harus dijaga**:
  - `canAddTicket` menerima `activeBooked` dari data server, dengan test untuk kuota habis dan booking aktif.
  - Tidak ada input NIK di `ui` Detail Ticket, dan tidak ada NIK mentah di key i18n, query key, atau log.
  - Skenario MSW: `quota-exhausted` dan `profile-incomplete`.
- **Pertanyaan terbuka**: NIK diisi saat pendaftaran atau saat pertama kali booking, dan apakah akun boleh mengubah NIK setelah tersimpan (usulan: tidak, hanya lewat bantuan admin).
