# ADR-0015: Use case sebagai fungsi murni di `core/application`, port sebagai tipe fungsi

- **Status**: Proposed
- **Tanggal**: 2026-10-22
- **Pengambil keputusan**: Tim FE Web
- **Requirement terkait**: FR-06–08, FR-13–25, NFR-02, NFR-04

## Konteks

[ADR-0002](0002-layered-clean-architecture.md) mendefinisikan aturan dependensi antar-package, tetapi tidak punya tempat untuk layer Application (use case). Akibatnya orkestrasi alur bisnis menumpuk di `features/*/use<Screen>ViewModel`, padahal aturan arsitektur menyebut ViewModel harus tipis dan logika bisnis ada di `core`.

Analisis layering 2026-10-22 menemukan hal yang sama. Di kode, yang bocor ke `features` adalah:

| Logika | Sebelumnya di | Sekarang |
|---|---|---|
| Merakit `stock` per kategori dan `activeBooked` dari sesi server untuk menambah tiket (ADR-0011). Duplikat di ViewModel dan mapper | `useBookingViewModel`, `toBookingViewProps` | `application/addTicket.ts`, `booking/stock.ts` |
| Aturan tombol lanjut (ada tiket dan sisa waktu) | `toBookingViewProps` | `booking/selection.ts` (`canSubmitBooking`) |
| Mengenali sesi booking berakhir (`ACCESS_EXPIRED`) | `useBookingViewModel` | `errors/appError.ts` (`isAccessExpired`) |
| Status order: masih berjalan, selesai, boleh mulai bayar | `usePaymentViewModel` | `payment/orderStatus.ts` |
| Giliran tiba → titipkan token sebagai sesi booking | `useQueueViewModel` | `application/enterBookingRoom.ts` |
| Mulai pembayaran untuk metode terpilih | `usePaymentViewModel` | `application/payOrder.ts` |

Tim lain menginginkan lima layer bernama dengan class, interface, dan container DI (Awilix). Itu bertabrakan dengan [ADR-0003](0003-presentation-pattern-viewmodel-hooks.md) (tanpa class dan lifecycle buatan) dan menambah framework internal yang tidak dibutuhkan penilai ("murah").

## Opsi yang dipertimbangkan

1. **Tetap di ViewModel.** Tidak ada perubahan, tetapi layer Application tidak punya rumah dan aturan bisnis hanya bisa dites dengan render.
2. **Fungsi murni di `packages/core/src/application`, port sebagai tipe fungsi.** Tanpa package baru, tanpa class, tanpa container DI.
3. **`packages/application` terpisah, protocol berupa interface, class use case, container DI.** Paling dekat dengan arsitektur lima layer bernama, tetapi setiap port hanya punya satu implementasi, dan class serta container tidak memberi apa pun yang tidak sudah diberikan fungsi dan parameter.

## Keputusan

Opsi 2.

- **Lokasi**: `packages/core/src/application/`. Boleh mengimpor domain di `core` (`domain`, `errors`, `booking`, `queue`, `time`, `payment`). **Domain tidak boleh mengimpor `application`** (ESLint). Arah dependensi: `application → domain`.
- **Bentuk**: fungsi biasa. Use case yang melakukan I/O menerima port lewat argumen pertama: `payOrder(deps, order, method)`, dengan `deps` objek kecil berisi port. Use case tanpa I/O adalah fungsi murni: `addTicket(session, selection, categoryId)`.
- **Port** adalah tipe fungsi di `application/ports.ts` (`StartSession`, `StartPayment`). Bukan interface atau class. Adapter di `packages/api` memenuhinya secara struktural, tanpa `implements`.
- **Composition root**: `apps/web/features/shared/composition.ts` mengekspor objek `application` yang menyambungkan use case ke adapter. Manual dan eksplisit. ViewModel memanggil `application.payOrder(...)`.
- **ESLint menegakkan batasnya**: `features` (selain `composition.ts`, test, dan `AppProviders`) tidak boleh mengimpor `startPayment` atau `startSession` dari `@rusuh/api`.
- **Pembagian tanggung jawab**:
  - *Query* (baca) tetap query options di `api`, dipanggil ViewModel ([ADR-0004](0004-server-state-tanstack-query.md)). Bukan use case.
  - *Command* yang punya aturan atau merangkai langkah adalah use case.
  - *Aturan satu langkah* tanpa I/O adalah fungsi domain (`canSubmitBooking`, `isPaymentActive`, `isAccessExpired`).
  - *ViewModel* tinggal: state UI, berlangganan cache, navigasi, pemetaan `AppError` ke key i18n.
- **Pengecualian**: `emulatePaymentOutcome` hanya ada di mock dan dipanggil langsung dari ViewModel.
- **Test**: use case dites di Vitest murni dengan port palsu (`vi.fn()`), tanpa render dan tanpa MSW. Test ViewModel tetap memakai MSW dan membuktikan penyambungannya.

## Konsekuensi

- **Positif**: layer Application punya rumah resmi. Aturan sesi, kuota, dan status order dites tanpa React. Dua tempat yang dulu menduplikasi perakitan `stock` kini memakai satu fungsi. Tidak ada class, container, atau framework internal, jadi tetap sejalan dengan ADR-0003.
- **Negatif**: satu lapis indirection (`composition.ts`). Dua use case pertama (`enterBookingRoom`, `payOrder`) tipis: satu aturan awal dan satu panggilan port. Nilainya ada pada aturan yang sekarang tertulis dan dites, dan pada template untuk use case berikutnya.
- **Negatif**: port berupa tipe fungsi tidak punya `implements`. Ketidakcocokan adapter baru ketahuan di `composition.ts` saat typecheck, bukan di file adapter.
- **Negatif**: `AppError` adalah union dengan data terstruktur kecil, jadi error tidak membawa konteks kaya (mis. nama kategori yang stoknya kurang). Konteks itu diambil dari state layar, bukan dari error.
- **Yang harus dijaga**:
  - Use case baru ditambahkan di `application/`, diekspor lewat `application/index.ts`, dan dites dengan port palsu.
  - Jangan menaruh React, Next, `fetch`, TanStack, atau `Date.now()` di `application/` (aturan `core` berlaku).
  - Tambahkan port ke `ports.ts` dan penyambungannya ke `composition.ts` bersamaan.

## Pekerjaan lanjutan (belum diputuskan)

- **`createBooking`** (validasi pilihan → cek kuota → hold atomik di BE) menunggu endpoint submit booking dan kontraknya dari BE ([ADR-0011](0011-nik-linked-to-account.md)). Bentuknya mengikuti pola ini: port `CreateBooking` di `ports.ts`, `createBooking(deps, session, selection, remainingMs)` memakai `canSubmitBooking` lalu memanggil port. `onSubmit` di `useBookingViewModel` masih dummy sampai itu ada.
- **Penamaan lapisan** di dokumen tim lain (Domain, Data, Application, Controllers, Presentation) dipetakan di [ADR-0002](0002-layered-clean-architecture.md#catatan-2026-10-22-peta-layer-konseptual). Keputusan siapa yang menjadi rujukan utama tetap perlu diambil tim.

## Catatan verifikasi (2026-10-22)

- 25 test baru (use case dengan port palsu, aturan status order, `stockByCategory`, `isAccessExpired`, `canSubmitBooking`). Test ViewModel dan mapper yang sudah ada lulus tanpa perubahan, jadi perilaku layar tidak berubah. Total 95 test.
- Aturan ESLint diuji dengan lima file probe: domain mengimpor `application` (ditolak), `application` mengimpor domain (lolos), `core` mengimpor `react` (ditolak), `features` mengimpor `startSession` dan `startPayment` dari `@rusuh/api` (ditolak), `features` mengimpor `@rusuh/mocks/node` (ditolak).
