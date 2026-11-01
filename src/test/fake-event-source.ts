import type { EventSourceFactory, EventSourceLike } from "@/core/data/sse/event-source-stream.client";

type Listener = (event: MessageEvent) => void;

/** EventSource palsu: Node tidak punya EventSource bawaan, dan test perlu mengendalikan kapan event datang. */
export class FakeEventSource implements EventSourceLike {
  closed = false;
  private readonly listeners = new Map<string, Set<Listener>>();

  constructor(
    readonly url: string,
    readonly init: EventSourceInit,
  ) {}

  addEventListener(type: string, listener: Listener): void {
    const set = this.listeners.get(type) ?? new Set();
    set.add(listener);
    this.listeners.set(type, set);
  }

  close(): void {
    this.closed = true;
  }

  emit(type: string, data?: unknown): void {
    const payload = typeof data === "string" || data === undefined ? data : JSON.stringify(data);
    this.listeners.get(type)?.forEach((listener) => listener(new MessageEvent(type, { data: payload })));
  }
}

/** Factory yang mencatat setiap stream yang dibuka. `find` mencari berdasarkan potongan URL. */
export function setupFakeEventSources() {
  const sources: FakeEventSource[] = [];
  const factory: EventSourceFactory = (url, init) => {
    const source = new FakeEventSource(url, init);
    sources.push(source);
    return source;
  };
  const find = (urlPart: string) => sources.findLast((source) => source.url.includes(urlPart));
  return { sources, factory, find };
}
