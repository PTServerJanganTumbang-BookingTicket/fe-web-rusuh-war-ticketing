import type { z } from "zod";

/**
 * Abstraksi HTTP untuk repository. Kegagalan selalu dilempar sebagai `AppFailure`,
 * sukses selalu diparse dengan schema zod.
 */
export interface HttpClient {
  get<T>(path: string, schema: z.ZodType<T>): Promise<T>;
  post<T>(path: string, body: unknown, schema: z.ZodType<T>): Promise<T>;
}
