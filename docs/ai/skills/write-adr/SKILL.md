---
name: write-adr
description: Menulis Architecture Decision Record baru di docs/adr dengan template tim, termasuk opsi yang ditolak dan konsekuensinya. Gunakan saat ada keputusan arsitektur baru, perubahan keputusan lama, atau sebuah perubahan perlu melanggar aturan steering.
---

# Write ADR

## Langkah

1. **Tentukan nomor** berikutnya dari `docs/adr/README.md`.
2. **Salin** `docs/adr/0000-template.md` ke `docs/adr/NNNN-<slug-kebab>.md`.
3. **Isi Konteks** dengan masalah nyata dan batasan: requirement terkait (ID FR/NFR/BR), ukuran tim, tech radar, tenggat.
4. **Tulis minimal dua opsi**, masing-masing dengan kelebihan dan kekurangan yang jujur. Opsi yang ditolak tetap dicatat.
5. **Keputusan** dinyatakan tegas dalam satu kalimat, diikuti aturan turunannya.
6. **Konsekuensi**: positif, negatif, dan *yang harus dijaga* (lint, test, atau review yang menegakkan keputusan).
7. **Status awal `Proposed`.** Diubah ke `Accepted` setelah disepakati tim.
8. **Jika menggantikan ADR lama**, ubah status ADR lama menjadi `Superseded by ADR-NNNN`. Jangan menghapus atau menulis ulang isinya.
9. **Perbarui** tabel di `docs/adr/README.md` dan, bila aturan berubah, `docs/ai/steering/architecture-rules.md`.

## Checklist

- [ ] Ada ID requirement yang dirujuk.
- [ ] Ada opsi yang ditolak beserta alasannya.
- [ ] Ada mekanisme penegakan.
