/** Mode saat waktu booking habis dan server menjawab ACCESS_EXPIRED (ADR-0005). */
export type BookingExpiryMode = "queue" | "screen";

/** Konfigurasi runtime. Hanya composition root (`src/di/app-config.reader.ts`) yang membaca `process.env`. */
export type AppConfig = {
  apiBaseUrl: string;
  /** Origin aplikasi ini untuk route handler same-origin. Kosong di browser (path relatif). */
  appBaseUrl: string;
  /**
   * Cookie ke host API. `include` mengikuti kontrak (cookie `queue_token`). `omit` untuk backend lintas origin yang
   * menjawab `Access-Control-Allow-Origin: *`: peramban menolak cookie di sana, jadi token antrian dikirim lewat
   * header `X-Queue-Token` dan stream dibuka tanpa cookie.
   */
  apiCredentials: "include" | "omit";
  /** API dimock dengan MSW; kontrol simulasi hanya muncul di mode ini. */
  mocking: boolean;
  bookingExpiry: BookingExpiryMode;
  /** Cookie akun memakai atribut `Secure` (production). Hanya dibaca route same-origin di server. */
  secureCookies: boolean;
};
