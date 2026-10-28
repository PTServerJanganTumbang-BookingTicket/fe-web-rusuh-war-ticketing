import type { z } from "zod";
import type { Observer, Unsubscribe } from "@/core/application/LiveUpdates";

/** Abstraksi stream Server-Sent Events untuk adapter. Payload selalu diparse dengan schema zod. */
export interface EventStreamClient {
  open<T>(path: string, event: string, schema: z.ZodType<T>, observer: Observer<T>): Unsubscribe;
}
