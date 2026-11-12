/**
 * @file layout.tsx
 * @description Layout untuk embedded routes (WebView mobile).
 *
 * Route group ini digunakan untuk halaman yang dibuka di WebView dari aplikasi mobile.
 * Semua route di bawah `(embed)/` akan menggunakan layout ini.
 *
 * Perbedaan dari web desktop:
 * - Tidak ada nav header
 * - Tidak ada footer
 * - Hasil ditampilkan via postMessage, bukan navigasi
 *
 * Deteksi WebView:
 * - Menggunakan `isReactNativeWebView()` dari webview-handoff.rules.ts
 * - TIDAK menggunakan navigator.userAgent karena tidak reliable dan bisa di-spoof
 * - ADR-007 §7: Tanpa window.ReactNativeWebView → tampilkan "Buka dari aplikasi"
 *
 * @requirements 14.38
 * @see ADR-007 Mobile WebView Payment Handoff
 */

import type { ReactNode } from "react";

type EmbedLayoutProps = {
  children: ReactNode;
};

/**
 * Minimal layout untuk embedded WebView routes.
 *
 * Layout ini tidak merender `<html>` dan `<body>` karena itu sudah di-handle
 * oleh root layout (`src/app/layout.tsx`). Sebagai route group layout,
 * ini hanya wrap children dengan struktur minimal.
 *
 * Deteksi `isEmbedded` dilakukan di controller via `isReactNativeWebView()`
 * karena:
 * 1. Deteksi harus terjadi di client-side (checking window.ReactNativeWebView)
 * 2. Controller dan views sudah menggunakan fungsi ini untuk deteksi
 * 3. Pattern ini lebih sederhana daripada Context + Provider
 *
 * @requirements 14.38
 */
export default function EmbedLayout({ children }: EmbedLayoutProps) {
  // Layout minimal untuk WebView - tanpa nav/footer
  // isEmbedded detection dilakukan di controller via isReactNativeWebView()
  return <>{children}</>;
}
