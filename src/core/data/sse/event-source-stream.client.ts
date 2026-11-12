import type { AppConfig } from "@/core/domain/app-config.model";
import type { Observer, Unsubscribe } from "@/core/domain/live-updates.protocol";
import type { EventStreamClient, StreamOptions, StreamSchemas } from "./event-stream.client";
import { openFetchEventStream } from "./fetch-event-stream";

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
 * Autentikasi lewat cookie (`withCredentials`), token tidak pernah di URL (ADR-0008). URL absolut dipakai apa adanya
 * (kontrak §3.1: `sse_url` menunjuk host stream, bukan host API).
 */
export function createEventSourceStreamClient({
  appConfig,
  eventSourceFactory,
}: {
  appConfig: AppConfig;
  eventSourceFactory: EventSourceFactory;
}): EventStreamClient {
  return {
    open<T>(
      path: string,
      schemas: StreamSchemas<T>,
      observer: Observer<T>,
      options?: StreamOptions,
    ): Unsubscribe {
      const url = /^https?:\/\//.test(path) ? path : `${appConfig.apiBaseUrl}${path}`;
      if (options?.headers && Object.keys(options.headers).length > 0)
        return openFetchEventStream(url, options.headers, schemas, observer);
      const source = eventSourceFactory(url, { withCredentials: appConfig.apiCredentials === "include" });
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
