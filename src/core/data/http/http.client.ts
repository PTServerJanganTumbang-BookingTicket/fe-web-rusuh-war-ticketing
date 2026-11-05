import type { z } from "zod";
import type { ApiErrorCode } from "@/core/domain/app-error";

export type RequestOptions = {
  headers?: Record<string, string>;
  /**
   * Arti status HTTP gagal untuk endpoint ini. Response error kontrak hanya membawa `meta.code` numerik dan
   * `meta.message`, jadi service yang tahu arti 401 atau 409 di endpoint-nya (ADR-0009).
   */
  errorCodes?: Partial<Record<number, ApiErrorCode>>;
};

/**
 * Klien HTTP untuk service di `data/`. Response kontrak `{ meta, data }` dibuka di sini, lalu `data` diparse
 * dengan schema zod. Kegagalan selalu dilempar sebagai `AppFailure`.
 */
export interface HttpClient {
  get<T>(path: string, schema: z.ZodType<T>, options?: RequestOptions): Promise<T>;
  post<T>(path: string, body: unknown, schema: z.ZodType<T>, options?: RequestOptions): Promise<T>;
  patch<T>(path: string, body: unknown, schema: z.ZodType<T>, options?: RequestOptions): Promise<T>;
  /** Sukses tanpa isi (mis. 204) cukup diselesaikan; tidak ada `data` untuk diparse. */
  delete(path: string, options?: RequestOptions): Promise<void>;
}
