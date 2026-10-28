# ADR-0009: Contract-first dengan OpenAPI dan MSW

- **Status**: Proposed
- **Tanggal**: 2026-10-18
- **Pengambil keputusan**: Tim FE Web dan BE (Erma S Nurmasyita, Handoko D Wicaksono)
- **Requirement terkait**: NFR-08, aturan evaluasi #5 (dokumentasi)

## Konteks

FE dan BE dikerjakan paralel dalam waktu singkat. Kalau FE menunggu endpoint jadi, FE menganggur. Kalau FE menebak bentuk response, integrasi di akhir penuh kejutan.

## Keputusan

1. **BE menerbitkan `openapi.yaml` di hari pertama**, minimal untuk: events, queue, booking session, booking, payment, order status, server time.
2. **Tipe di-generate** ke `packages/api/generated` dengan `openapi-typescript`. File hasil generate tidak diedit manual.
3. **Response diparse dengan zod di adapter** dan dipetakan ke tipe domain `core`. Tipe generated tidak bocor ke `ui` atau `features`.
4. **Katalog error code** bagian dari kontrak:

   | Code | Arti | Perilaku FE |
   |---|---|---|
   | `NIK_INVALID` | Format/struktur NIK salah | Pesan inline di field NIK |
   | `QUOTA_EXCEEDED` | Akumulasi tiket NIK > 3 | Pesan inline + sisa kuota |
   | `STOCK_INSUFFICIENT` | Stok berubah saat submit | Popup stok terbaru (jawaban klien) |
   | `ACCESS_EXPIRED` | TTL booking habis | Layar sesi berakhir |
   | `QUEUE_TOKEN_INVALID` | Token antrian tidak valid | Kembali ke Waiting Room |
   | `SLOT_TAKEN_OVER` | Sesi diambil tab/perangkat lain | Layar sesi dipindahkan |
   | `PAYMENT_EXPIRED` | TTL pembayaran habis | Layar expired |

5. **MSW di `mocks/`** dengan skenario bernama (`queue-moving`, `stock-runs-out`, `payment-expires`, `slot-taken-over`) yang bisa dipilih lewat query `?scenario=` di mode development, dipakai juga oleh Storybook dan test.

## Konsekuensi

- **Positif**: FE jalan sejak hari pertama. Perubahan kontrak terdeteksi saat generate dan compile. Skenario MSW menjadi bahan demo state ekstrem.
- **Negatif**: butuh disiplin memperbarui spec saat BE berubah.
- **Yang harus dijaga**: CI menjalankan generate dan gagal bila hasilnya berbeda dari yang di-commit. Skill [`sync-api-contract`](../ai/skills/sync-api-contract/SKILL.md) menjadi prosedur standar.

## Catatan implementasi (2026-10-28)

- MSW pindah dari package `@rusuh/mocks` ke `src/mocks` ([ADR-0013](0013-single-app-modular-structure.md)). Skema zod ada di adapter `infrastructure` tiap modul; tipe generated nantinya di `src/platform/http/generated/`.
- Endpoint simulasi pembayaran (`/mock/...`) dipisah menjadi port `PaymentSimulator` agar `OrderRepository` hanya berisi kontrak BE asli ([ADR-0014](0014-modular-clean-architecture-solid.md)).
