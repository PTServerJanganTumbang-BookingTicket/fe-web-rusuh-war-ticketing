import type { Observer, Unsubscribe } from "@/core/domain/live-updates.protocol";
import type { StreamSchemas } from "./event-stream.client";

const DEFAULT_RETRY_MS = 3_000;
const MAX_RETRY_MS = 30_000;
/** Status yang tidak akan membaik dengan mengulang: token tak dikenal, perangkat lain, stream ditutup. */
const FATAL_STATUSES = new Set([401, 403, 404, 410]);

function parseJson(data: string): unknown {
  try {
    return JSON.parse(data);
  } catch {
    return undefined;
  }
}

type Frame = { event: string; data: string; id?: string; retry?: number };

/** Parser SSE bertahap (WHATWG): baris `field: value`, frame diakhiri baris kosong, baris `:` adalah komentar. */
function createFrameParser(onFrame: (frame: Frame) => void) {
  let buffer = "";
  let event = "";
  let data: string[] = [];
  let id: string | undefined;
  let retry: number | undefined;

  const flush = () => {
    if (data.length > 0) onFrame({ event: event || "message", data: data.join("\n"), id, retry });
    else if (retry !== undefined) onFrame({ event: "", data: "", retry });
    event = "";
    data = [];
    retry = undefined;
  };

  const line = (text: string) => {
    if (text === "") return flush();
    if (text.startsWith(":")) return;
    const colon = text.indexOf(":");
    const field = colon === -1 ? text : text.slice(0, colon);
    const raw = colon === -1 ? "" : text.slice(colon + 1);
    const value = raw.startsWith(" ") ? raw.slice(1) : raw;
    if (field === "event") event = value;
    else if (field === "data") data.push(value);
    else if (field === "id") id = value;
    else if (field === "retry" && /^\d+$/.test(value)) retry = Number(value);
  };

  return {
    push(chunk: string) {
      buffer += chunk;
      const lines = buffer.split(/\r\n|\r|\n/);
      buffer = lines.pop() ?? "";
      lines.forEach(line);
    },
  };
}

/**
 * Stream SSE lewat `fetch` untuk kredensial yang harus dikirim sebagai header. `EventSource` tidak bisa menyetel
 * header, padahal tanpa cookie (mode `omit`) satu-satunya jalur yang sah ke stream antrian adalah `X-Queue-Token`
 * (kontrak §3.2; token tidak pernah di query string). Perilakunya meniru `EventSource`: sambung ulang otomatis
 * dengan `Last-Event-ID` dan jeda `retry:` dari server, kecuali status yang pasti gagal (401/403/404/410).
 */
export function openFetchEventStream<T>(
  url: string,
  headers: Record<string, string>,
  schemas: StreamSchemas<T>,
  observer: Observer<T>,
): Unsubscribe {
  let closed = false;
  let controller: AbortController | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let lastEventId: string | undefined;
  let retryMs = DEFAULT_RETRY_MS;
  let failures = 0;

  const schedule = () => {
    if (closed) return;
    const backoff = Math.min(retryMs * 2 ** Math.min(failures, 4), MAX_RETRY_MS);
    // Jitter supaya klien yang putus bersamaan tidak menyambung bersamaan (kontrak §3.2: badai reconnect).
    timer = setTimeout(connect, backoff * (0.75 + Math.random() * 0.5));
  };

  const dispatch = (frame: Frame) => {
    if (frame.retry !== undefined) retryMs = frame.retry;
    if (frame.id !== undefined) lastEventId = frame.id;
    const schema = schemas[frame.event];
    if (!schema || frame.data === "") return;
    const parsed = schema.safeParse(parseJson(frame.data));
    if (parsed.success) observer.next(parsed.data);
  };

  async function connect() {
    timer = undefined;
    if (closed) return;
    controller = new AbortController();
    try {
      const response = await fetch(url, {
        headers: {
          accept: "text/event-stream",
          "cache-control": "no-cache",
          ...headers,
          ...(lastEventId ? { "last-event-id": lastEventId } : {}),
        },
        credentials: "omit",
        cache: "no-store",
        signal: controller.signal,
      });
      const isStream = response.headers.get("content-type")?.includes("text/event-stream") ?? false;
      if (!response.ok || !isStream || !response.body) {
        observer.disconnected();
        if (FATAL_STATUSES.has(response.status)) return;
        failures += 1;
        return schedule();
      }
      failures = 0;
      observer.connected();
      const parser = createFrameParser(dispatch);
      const decoder = new TextDecoder();
      const reader = response.body.getReader();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        parser.push(decoder.decode(value, { stream: true }));
      }
    } catch {
      if (closed) return;
      failures += 1;
    }
    if (closed) return;
    observer.disconnected();
    schedule();
  }

  void connect();
  return () => {
    closed = true;
    if (timer) clearTimeout(timer);
    controller?.abort();
  };
}
