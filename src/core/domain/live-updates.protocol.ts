/**
 * Pengamat pembaruan langsung dari server (SSE, ADR-0016). `connected`/`disconnected` melaporkan status
 * koneksi supaya controller bisa kembali ke polling saat stream putus.
 */
export type Observer<T> = {
  next(value: T): void;
  connected(): void;
  disconnected(): void;
};

export type Unsubscribe = () => void;
