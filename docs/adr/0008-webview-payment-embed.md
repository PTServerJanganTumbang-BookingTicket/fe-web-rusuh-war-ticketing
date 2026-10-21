# ADR-0008: Payment page sebagai embed WebView untuk mobile

- **Status**: Proposed (draft kontrak dengan tim Mobile)
- **Tanggal**: 2026-10-18
- **Pengambil keputusan**: Tim FE Web dan Mobile (Mochamad Rosyid Ridho)
- **Requirement terkait**: Scope "payment page web reusable di mobile", FR-24, Sequence 8.4, NFR-07

## Konteks

Mobile app tidak membangun UI pembayaran native. Ia membuka payment page web di WebView. Tiga hal harus disepakati: bagaimana session masuk ke WebView, bagaimana app tahu pembayaran selesai, dan bagaimana deeplink e-wallet ditangani.

## Keputusan

### 1. Session masuk lewat one-time code

1. App meminta one-time code ke BE (`POST /auth/webview-code`, berlaku 60 detik, sekali pakai).
2. App membuka `https://<host>/m/orders/{orderId}/pay?code=<otc>`.
3. Route handler `api/session/exchange` menukar code menjadi cookie `httpOnly; Secure; SameSite=Lax`, lalu redirect ke URL yang sama tanpa `code`.

Token mentah tidak pernah muncul di URL atau log.

### 2. Route embed

- `app/(embed)/m/orders/[orderId]/pay` memakai layout tanpa navbar dan footer, dengan dukungan safe area.
- **Container dan ViewModel sama persis dengan versi web.** Yang berbeda hanya layout dan adapter `PaymentResultNotifier`.

### 3. `PaymentResultNotifier`

Interface di `core`, implementasi dipilih saat runtime oleh layout:

```ts
export interface PaymentResultNotifier {
  notify(result: { orderId: string; status: 'paid' | 'expired' | 'failed' }): void;
}
```

| Implementasi | Perilaku |
|---|---|
| Web | `router.replace('/orders/{id}/ticket')` atau halaman expired |
| WebView | `window.ReactNativeWebView?.postMessage(...)` / JS bridge native bila ada; fallback redirect ke `rusuh://payment-result?orderId=...&status=...` |

### 4. Deeplink e-wallet

Redirect ke skema e-wallet (`gojek://`, dll.) dari dalam WebView harus ditangkap app dan dibuka di luar WebView. Ini tanggung jawab Mobile. FE menyediakan URL deeplink apa adanya dari response BE.

## Konsekuensi

- **Positif**: satu implementasi pembayaran untuk dua platform. Perbaikan di web langsung berlaku di mobile.
- **Negatif**: perlu test manual di Android WebView dan iOS WKWebView. Dijadwalkan sebelum demo.
- **Yang harus dijaga**: route `(embed)` tidak boleh mengimpor komponen navigasi global. Kontrak di atas dibekukan setelah disetujui Mobile. Perubahan butuh ADR baru.

## Catatan implementasi (2026-10-19)

`app/api/session/exchange` (penukaran one-time code WebView) **belum diimplementasikan**; menunggu kontrak `POST /auth/webview-code` dari BE. Waiting Room web memakai route terpisah `app/api/session/start`, yang menerima `{ "accessToken": string }` dan menyimpannya ke cookie `httpOnly`. Keduanya dipisah agar kontrak WebView tidak tercampur dengan alur web.

