/**
 * Kredensial yang dikirim klien sebagai header ke API (kontrak, security schemes).
 * Grant token membuktikan pemegang slot booking; device ID mengikat grant tamu ke perangkat ini.
 */
export interface CredentialStoreProtocol {
  /** Acak 128 bit, stabil per perangkat. Wajib untuk tamu saat join antrian dan di setiap panggilan ber-grant. */
  deviceId(): string;
  /**
   * Grant yang tersimpan. Dengan `eventId`, hanya grant milik event itu yang dikembalikan: grant event lain tidak
   * pernah dipakai untuk event ini (kontrak §4.1: grant untuk event lain ditolak). Tanpa `eventId`, grant yang sedang
   * dipegang, untuk endpoint yang tidak membawa event (pembayaran).
   */
  grantToken(eventId?: string): string | null;
  saveGrantToken(eventId: string, token: string): void;
  clearGrantToken(): void;
  /**
   * Token ruang tunggu (`qt_…`) per event, untuk header `X-Queue-Token`. Hanya dipakai bila cookie `queue_token`
   * tidak bisa dipakai (`AppConfig.apiCredentials = "omit"`).
   */
  queueToken(eventId: string): string | null;
  saveQueueToken(eventId: string, token: string): void;
  clearQueueToken(eventId: string): void;
  /** Membuang token ruang tunggu semua event (identitas di perangkat berganti). */
  clearQueueTokens(): void;
}
