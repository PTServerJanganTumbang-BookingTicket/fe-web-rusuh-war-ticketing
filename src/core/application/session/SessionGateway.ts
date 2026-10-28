/** Port penyimpanan access token antrian. Implementasinya menitipkan token ke cookie httpOnly (ADR-0008). */
export interface SessionGateway {
  start(accessToken: string): Promise<void>;
}
