# Dokumentasi Frontend — Rusuh Booking Tiket

Titik masuk semua dokumentasi FE. Baca berurutan saat onboarding.

| Folder | Isi | Pembaca utama |
|---|---|---|
| [`architecture/`](architecture/overview.md) | Gambaran arsitektur, lapisan, aturan dependensi, peta requirement | Semua |
| [`adr/`](adr/README.md) | Architecture Decision Record, satu keputusan per file | Semua, penilai |
| [`ai/steering/`](ai/steering/README.md) | Aturan yang wajib diikuti AI tools saat bekerja di repo ini | AI agent, reviewer |
| [`ai/skills/`](ai/skills/README.md) | Prosedur berulang yang bisa dijalankan AI agent (dan manusia) | AI agent, developer |
| [`ai/usage-log.md`](ai/usage-log.md) | Catatan penggunaan AI tools selama pengerjaan | Penilai |

## Aturan dokumentasi

- **Keputusan arsitektur baru wajib ADR.** Gunakan [`adr/0000-template.md`](adr/0000-template.md) atau skill [`write-adr`](ai/skills/write-adr/SKILL.md).
- **ADR tidak dihapus.** ADR yang diganti diberi status `Superseded by ADR-XXXX`.
- **Folder `ai/` tidak boleh dihapus atau dipangkas.** Ini aturan evaluasi: steering, dokumentasi, dan data pendukung penggunaan AI harus tetap ada.
- **Bahasa**: dokumentasi dalam Bahasa Indonesia. Identifier kode, nama file, dan istilah teknis tetap bahasa Inggris.
