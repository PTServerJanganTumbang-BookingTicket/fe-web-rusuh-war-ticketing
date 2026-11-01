# ADR-0016: Pembaruan antrian dan status pembayaran lewat SSE, polling sebagai cadangan

- **Status**: Proposed
- **Tanggal**: 2026-10-28
- **Pengambil keputusan**: Tim FE Web, mengikuti keputusan transport tim ("Transport: SSE")
- **Requirement terkait**: FR-06–10, FR-20–25, NFR-05, NFR-06
- **Terkait**: [ADR-0004](0004-server-state-tanstack-query.md) (dipersempit), [ADR-0005](0005-server-authoritative-time.md), [ADR-0008](0008-webview-payment-embed.md), [ADR-0015](0015-dependency-injection-awilix.md)

## Konteks

ADR-0004 memakai polling dengan jitter untuk posisi antrian (mengikuti `retryAfter` server) dan status order (3 detik selama pending). Saat flash crowd, polling berarti setiap klien menembak BE secara berkala walaupun tidak ada perubahan, dan pembaruan terlambat sampai satu interval. Tim memutuskan transport realtime adalah **SSE**.

Batasan:

- "Jaga UX apa pun kondisi backend" dan "Jangan PHP" (product.md): stream yang putus tidak boleh membuat layar beku atau memutus customer.
- Token tidak boleh di URL (ADR-0008). `EventSource` tidak bisa mengirim header `Authorization`.
- Server tetap otoritatif atas waktu dan kedaluwarsa (ADR-0005).
- Node (test, server Next) tidak punya `EventSource` bawaan.

## Opsi yang dipertimbangkan

1. **Tetap polling** (ADR-0004). Sederhana dan tahan gangguan, tetapi beban BE berbanding lurus dengan jumlah klien dan pembaruan terlambat.
2. **WebSocket.** Dua arah, tetapi FE hanya butuh satu arah, perlu protokol dan reconnect sendiri, dan lebih sulit lewat proxy/CDN.
3. **SSE dengan polling sebagai cadangan** (dipilih). Satu arah, HTTP biasa, reconnect dan `Last-Event-ID` ditangani browser, cookie terkirim otomatis.

## Keputusan

Opsi 3.

- **Cakupan**: posisi antrian (`GET /events/{eventId}/queue/stream`, event `queue`) dan status order (`GET /orders/{orderId}/stream`, event `order`). Payload sama dengan response GET snapshot masing-masing, sehingga schema zod dipakai bersama. Server mengirim **snapshot saat tersambung**, lalu setiap perubahan, dan menutup stream di status akhir (`admitted`; `paid`/`failed`/`expired`).
- **Snapshot awal tetap lewat GET** (TanStack Query). Stream menulis ke cache query yang sama (`setQueryData`), jadi controller dan mapper tidak berubah.
- **Polling hanya cadangan.** `refetchInterval` mati selama stream tersambung (`live`) dan menyala lagi dengan jitter saat stream putus (event `error` EventSource), sampai browser berhasil menyambung ulang.
- **Klien menutup stream di status akhir** (`until`), supaya EventSource tidak menyambung ulang setelah server menutup.
- **Autentikasi lewat cookie** (`withCredentials: true`); tidak ada token di query string.
- **Kedaluwarsa tetap ditanyakan ke server** saat timer nol (ADR-0005), lewat GET, bukan disimpulkan dari stream.
- **Stok di Detail Ticket tetap polling** sampai BE menyediakan stream stok.

### Penempatan di lapisan (ADR-0014, ADR-0015)

| Lapisan | Isi |
|---|---|
| `core/domain/live-updates.protocol.ts` | `Observer<T>` (`next`, `connected`, `disconnected`) dan `Unsubscribe` |
| `modules/<m>/domain` | `QueueUpdatesProtocol` / `OrderUpdatesProtocol` |
| `modules/<m>/application` | `WatchQueueStateUseCase` / `WatchOrderUseCase` |
| `core/data/sse` | `EventStreamClient` (interface) dan `EventSourceStreamClient` (EventSource + zod), `eventSourceFactory` diinjeksikan |
| `modules/<m>/data` | `SseQueueUpdatesService`, `SseOrderUpdatesService` |
| `core/controllers/live-updates.hook.ts` (`useLiveUpdates`) | Berlangganan di effect, menulis ke cache query, mengembalikan `live` |
| `src/mocks/handlers.ts` | Handler `sse` MSW untuk kedua stream, hanya didaftarkan bila `EventSource` ada (browser) |

## Konsekuensi

- **Positif**: pembaruan langsung tanpa menunggu interval; beban polling BE hilang selama stream sehat. Stream putus tidak mengubah UX karena polling mengambil alih. Service bisa diganti (mis. WebSocket) tanpa menyentuh controller.
- **Negatif**: BE harus menahan koneksi terbuka per klien. Pada batas antrian yang dibicarakan (300.000) itu butuh HTTP/2, idle timeout load balancer di atas interval heartbeat, dan komentar heartbeat (`:`) berkala. Untuk API lintas origin dengan cookie, BE perlu CORS `Access-Control-Allow-Credentials`. Ada dua jalur data (stream dan polling) yang harus menghasilkan bentuk yang sama.
- **Test**: Node tidak punya EventSource, jadi test memakai `FakeEventSource` (`src/test/fake-event-source.ts`) lewat override `eventSourceFactory` di container uji; handler MSW SSE hanya dipakai di browser (dev dan E2E).
- **Yang harus dijaga**: kontrak endpoint stream disepakati dengan BE (path, nama event, heartbeat, penutupan di status akhir). Test controller memeriksa bahwa stream ditutup di status akhir dan bahwa data stream tampil.
