/**
 * Protocol penyimpanan grant antrian. Implementasinya menitipkan grant ke cookie httpOnly (ADR-0008) dan mencatat
 * event pemiliknya, karena grant hanya berlaku untuk event yang antriannya dilewati customer.
 */
export interface SessionProtocol {
  start(eventId: string, accessToken: string): Promise<void>;
  /**
   * Membuang grant (cookie dan salinan di klien) supaya customer boleh masuk Waiting Room lagi. Token antrian
   * dipertahankan. Tidak menghapus cookie grant lain yang lebih baru (misalnya dari tab lain).
   */
  end(): Promise<void>;
  /** Identitas di perangkat berganti: grant dan semua token antrian dibuang. */
  reset(): Promise<void>;
}
