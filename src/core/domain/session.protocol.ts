/** Protocol penyimpanan access token antrian. Implementasinya menitipkan token ke cookie httpOnly (ADR-0008). */
export interface SessionProtocol {
  start(accessToken: string): Promise<void>;
}
