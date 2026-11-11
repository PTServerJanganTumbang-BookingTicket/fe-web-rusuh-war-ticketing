import type { AppConfig } from "@/core/domain/app-config.model";

/** Satu-satunya tempat `process.env` dibaca untuk konfigurasi runtime aplikasi. */
export function readAppConfig(): AppConfig {
  return {
    apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://api.rusuh.test",
    appBaseUrl: "",
    apiCredentials: process.env.NEXT_PUBLIC_API_CREDENTIALS === "omit" ? "omit" : "include",
    mocking: process.env.NEXT_PUBLIC_API_MOCKING === "enabled",
    // Toggle uji: "screen" menampilkan layar sesi berakhir; selain itu kembali ke ruang tunggu (ADR-0005).
    bookingExpiry: process.env.NEXT_PUBLIC_BOOKING_EXPIRY === "screen" ? "screen" : "queue",
    secureCookies: process.env.NODE_ENV === "production",
  };
}
