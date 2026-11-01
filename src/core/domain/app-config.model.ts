/** Mode saat waktu booking habis dan server menjawab ACCESS_EXPIRED (ADR-0005). */
export type BookingExpiryMode = "queue" | "screen";

/** Konfigurasi runtime. Hanya composition root (`src/di/app-config.reader.ts`) yang membaca `process.env`. */
export type AppConfig = {
  apiBaseUrl: string;
  /** Origin aplikasi ini untuk route handler same-origin. Kosong di browser (path relatif). */
  appBaseUrl: string;
  /** API dimock dengan MSW; kontrol simulasi hanya muncul di mode ini. */
  mocking: boolean;
  bookingExpiry: BookingExpiryMode;
};
