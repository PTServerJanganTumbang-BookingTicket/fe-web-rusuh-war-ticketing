import type { AppConfig } from "@/core/domain/app-config.model";

/**
 * Panggilan yang membawa identitas akun (join antrian, grant, NIK, booking) lewat route same-origin
 * `/api/account/*`, yang menambahkan `Authorization: Bearer` dari cookie httpOnly (ADR-0023). Pengecualian: mock di
 * browser (dev, e2e), karena state MSW browser tidak terlihat oleh route di server; di sana panggilan langsung ke
 * API dan mock tidak memeriksa Bearer.
 */
export const viaAccountGateway = (config: AppConfig): boolean =>
  !(config.mocking && config.appBaseUrl === "");

/**
 * Token antrian dikirim sebagai `X-Queue-Token`, bukan cookie. Cookie `queue_token` disetel host API, sedangkan
 * route same-origin tidak meneruskan `Set-Cookie` itu ke browser, jadi stream SSE di host API tidak akan
 * memilikinya. Dipakai juga bila cookie memang tidak bisa dipakai (`apiCredentials = "omit"`).
 */
export const queueTokenInHeader = (config: AppConfig): boolean =>
  config.apiCredentials === "omit" || viaAccountGateway(config);
