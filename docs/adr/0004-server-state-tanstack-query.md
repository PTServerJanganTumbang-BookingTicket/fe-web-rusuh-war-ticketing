# ADR-0004: Server state dengan TanStack Query

- **Status**: Proposed
- **Tanggal**: 2026-10-18
- **Pengambil keputusan**: Tim FE Web
- **Requirement terkait**: FR-07, FR-10, NFR-01, NFR-06

## Konteks

Waiting Room melakukan polling posisi antrian, Detail Ticket me-refresh stok, dan Payment memantau status pending. Saat flash crowd, ribuan klien yang polling serentak bisa ikut membebani server.

## Opsi yang dipertimbangkan

1. **Global store (Redux, Zustand) + fetch manual.** Cache, retry, dan dedupe ditulis sendiri.
2. **SWR.** Ringan, tetapi dukungan mutation dan kontrol retry lebih terbatas.
3. **TanStack Query.** Cache, dedupe, retry dengan backoff, `refetchInterval`, pause saat tab tidak aktif, dan mutation sudah tersedia.

## Keputusan

Opsi 3. Aturan:

- **Server state hanya di TanStack Query.** Tidak di Context, tidak di global store.
- **Polling selalu dengan jitter** (interval dasar ± 20%) agar klien tidak serentak menghantam server.
- **Backoff eksponensial saat error**, dengan batas atas. Interval polling mengikuti `retryAfter` dari server bila tersedia.
- **Query key distandarkan** di `packages/api/queryKeys.ts`.
- **UI state lokal** (pilihan kategori, modal) memakai `useReducer`/`useState` di ViewModel.

## Konsekuensi

- **Positif**: tidak perlu menulis ulang caching dan retry. Perilaku polling bisa diatur terpusat untuk melindungi server (NFR-01).
- **Negatif**: satu dependensi tambahan yang perlu ada di tech radar.
- **Yang harus dijaga**: hook query/mutation hanya didefinisikan di `features` atau `packages/api/hooks`, tidak di `ui`.

## Catatan implementasi (2026-10-19)

- `packages/api` mengekspor *query options* (`queuePositionQuery`, `bookingSessionQuery`, `orderQuery`), bukan hook. `useQuery` dan `useMutation` dipanggil dari ViewModel di `features`, sehingga `api` bebas dari React.
- Interval polling: antrian mengikuti `retryAfter` server, stok booking 15 detik, status pembayaran 3 detik, semuanya dengan jitter ±20%.

## Catatan implementasi (2026-10-28)

- Query options dan query key pindah ke presentation tiap modul (`queueQueries.ts`, `bookingQueries.ts`, `paymentQueries.ts`). Key diawali nama modul.
- `queryFn` memanggil use case (`getQueueState.execute(eventId)`), bukan adapter. Jitter memakai port `RandomSource` dari container, bukan `Math.random()` langsung ([ADR-0015](0015-dependency-injection-awilix.md)).
- **Dipersempit oleh [ADR-0016](0016-realtime-updates-sse.md)**: antrian dan status order kini didorong lewat SSE yang menulis ke cache query yang sama. Polling dengan jitter tetap ada, tetapi hanya aktif saat stream tidak tersambung. Stok di Detail Ticket tetap polling.
