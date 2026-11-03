import type { z } from "zod";
import type { Observer, Unsubscribe } from "@/core/domain/live-updates.protocol";

/**
 * Schema per nama event SSE, semuanya dipetakan ke satu tipe pesan. Event tanpa nama diterima sebagai `message`.
 * Event tanpa data (mis. `grant` di kontrak antrian) tetap diparse; payload-nya `undefined` bila bukan JSON.
 */
export type StreamSchemas<T> = Record<string, z.ZodType<T>>;

/** Abstraksi stream Server-Sent Events untuk service di `data/`. Payload selalu diparse dengan schema zod. */
export interface EventStreamClient {
  open<T>(path: string, schemas: StreamSchemas<T>, observer: Observer<T>): Unsubscribe;
}
