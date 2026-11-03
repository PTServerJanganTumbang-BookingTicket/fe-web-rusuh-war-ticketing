/**
 * Kredensial yang dikirim klien sebagai header ke API (kontrak, security schemes).
 * Grant token membuktikan pemegang slot booking; device ID mengikat grant tamu ke perangkat ini.
 */
export interface CredentialStoreProtocol {
  /** Acak 128 bit, stabil per perangkat. Wajib untuk tamu saat join antrian dan di setiap panggilan ber-grant. */
  deviceId(): string;
  grantToken(): string | null;
  saveGrantToken(token: string): void;
}
