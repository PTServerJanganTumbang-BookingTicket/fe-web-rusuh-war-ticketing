/** Protocol penyimpanan access token antrian. Implementasinya menitipkan token ke cookie httpOnly (ADR-0008). */
export interface SessionProtocol {
  start(accessToken: string): Promise<void>;
  /** Membuang grant (cookie dan salinan di klien) supaya customer boleh masuk Waiting Room lagi. */
  end(): Promise<void>;
}
