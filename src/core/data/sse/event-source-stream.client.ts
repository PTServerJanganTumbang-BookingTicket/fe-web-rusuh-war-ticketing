import type { AppConfig } from "@/core/domain/app-config.model";
import type { Observer, Unsubscribe } from "@/core/domain/live-updates.protocol";
import type { EventStreamClient, StreamSchemas } from "./event-stream.client";

/** Bagian EventSource yang dipakai. Memudahkan fake di test (Node tidak punya EventSource bawaan). */
export type EventSourceLike = {
  addEventListener(type: string, listener: (event: MessageEvent) => void): void;
  close(): void;
};

export type EventSourceFactory = (url: string, init: EventSourceInit) => EventSourceLike;

function parseJson(data: unknown): unknown {
  if (typeof data !== "string") return undefined;
  try {
    return JSON.parse(data);
  } catch {
    return undefined;
  }
}

/**
 * SSE lewat EventSource bawaan browser: reconnect dan `Last-Event-ID` ditangani browser.
 * Autentikasi lewat cookie (`withCredentials`), token tidak pernah di URL (ADR-0008).
 */
export function createEventSourceStreamClient({
  appConfig,
  eventSourceFactory,
}: {
  appConfig: AppConfig;
  eventSourceFactory: EventSourceFactory;
}): EventStreamClient {
  return {
    open<T>(path: string, schemas: StreamSchemas<T>, observer: Observer<T>): Unsubscribe {
      const source = eventSourceFactory(`${appConfig.apiBaseUrl}${path}`, { withCredentials: true });
      source.addEventListener("open", () => observer.connected());
      // Browser mencoba menyambung ulang sendiri; selama itu controller kembali ke polling.
      source.addEventListener("error", () => observer.disconnected());
      for (const [event, schema] of Object.entries(schemas)) {
        source.addEventListener(event, (message) => {
          const parsed = schema.safeParse(parseJson(message.data));
          // Payload rusak diabaikan; snapshot berikutnya (stream atau polling) yang menjadi sumber kebenaran.
          if (parsed.success) observer.next(parsed.data);
        });
      }
      return () => source.close();
    },
  };
}
