# Dokumentasi Frontend — Rusuh Booking Tiket

Titik masuk semua dokumentasi FE. Baca berurutan saat onboarding.

| Folder | Isi | Pembaca utama |
|---|---|---|
| [`architecture/`](architecture/overview.md) | Gambaran arsitektur, lapisan, aturan dependensi, peta requirement. Rinci: [routing dan lapisan](architecture/routing-and-layers.md), [login dan register](architecture/auth-login-register.md) | Semua |
| [`adr/`](adr/README.md) | Architecture Decision Record, satu keputusan per file | Semua, penilai |
| [`meetings/`](meetings/) | Notulen rapat (MoM), dampaknya ke ADR, dan pertanyaan terbuka. Terbaru: [fitur tambahan dan reversal](meetings/2026-10-28-mom-fitur-dan-reversal.md) | Semua |

## Sumber kebenaran

| Hal | Sumber |
|---|---|
| Requirement, kontrak API, ADR tingkat solusi (`ADR-001`–`ADR-005`) | Repo [`documentations`](https://github.com/PTServerJanganTumbang-BookingTicket/documentations) |
| Keputusan khusus FE (`ADR-0001` dst.), arsitektur FE | Repo ini |

Repo ini menautkan kontrak API, bukan menyalinnya. Bila ada perbedaan, `documentations` yang berlaku. Perhatikan penomoran: `ADR-005` di `documentations` berbeda dengan `ADR-0005` di repo ini.

## Aturan dokumentasi

- **Keputusan arsitektur baru wajib ADR.** Gunakan [`adr/0000-template.md`](adr/0000-template.md) atau skill [`write-adr`](../.kiro/skills/write-adr/SKILL.md).
- **ADR tidak dihapus.** ADR yang diganti diberi status `Superseded by ADR-XXXX`.
- **`docs/` hanya berisi ADR dan dokumentasi developer.** Aturan AI, skill, dan usage log ada di [`.kiro/`](../.kiro/steering/README.md).
- **Bahasa**: dokumentasi dalam Bahasa Indonesia. Identifier kode, nama file, dan istilah teknis tetap bahasa Inggris.
