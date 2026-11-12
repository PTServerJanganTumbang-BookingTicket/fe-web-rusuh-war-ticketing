import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { openFetchEventStream } from "../fetch-event-stream";

const schemas = {
  message: z.object({ n: z.number() }),
  stale: z.object({ stale: z.boolean() }).transform(() => ({ n: -1 })),
};

function streamResponse(chunks: string[], init: { status?: number; type?: string } = {}) {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
  return new Response(body, {
    status: init.status ?? 200,
    headers: { "content-type": init.type ?? "text/event-stream" },
  });
}

const observer = () => ({ next: vi.fn(), connected: vi.fn(), disconnected: vi.fn() });

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("openFetchEventStream", () => {
  it("mengirim header kredensial dan header SSE standar, tanpa cookie dan tanpa token di URL", async () => {
    const fetchMock = vi.fn().mockResolvedValue(streamResponse([]));
    vi.stubGlobal("fetch", fetchMock);
    const close = openFetchEventStream(
      "https://events.test/s",
      { "x-queue-token": "qt_1" },
      schemas,
      observer(),
    );
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://events.test/s");
    expect(init.headers).toMatchObject({
      accept: "text/event-stream",
      "cache-control": "no-cache",
      "x-queue-token": "qt_1",
    });
    expect(init.credentials).toBe("omit");
    close();
  });

  it("mem-parse pesan tanpa nama dan bernama, mengabaikan komentar keepalive dan payload rusak", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          streamResponse([
            'id: 1\ndata: {"n":',
            "5}\n\n: keepalive\n\n",
            'event: stale\ndata: {"stale":true}\n\n',
            "data: bukan-json\n\n",
            'event: tak-dikenal\ndata: {"n":9}\n\n',
          ]),
        ),
    );
    const o = observer();
    const close = openFetchEventStream("https://events.test/s", { "x-queue-token": "qt_1" }, schemas, o);
    await vi.waitFor(() => expect(o.next).toHaveBeenCalledTimes(2));
    expect(o.next.mock.calls.map(([value]) => value)).toEqual([{ n: 5 }, { n: -1 }]);
    expect(o.connected).toHaveBeenCalledTimes(1);
    close();
  });

  it("status 401 melapor putus dan tidak mengulang (polling cadangan yang mengambil alih)", async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockResolvedValue(streamResponse([], { status: 401, type: "application/json" }));
    vi.stubGlobal("fetch", fetchMock);
    const o = observer();
    openFetchEventStream("https://events.test/s", { "x-queue-token": "bad" }, schemas, o);
    await vi.advanceTimersByTimeAsync(120_000);
    expect(o.disconnected).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("menyambung ulang dengan Last-Event-ID setelah stream berakhir", async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(streamResponse(['id: 7\ndata: {"n":1}\n\n']))
      .mockResolvedValue(streamResponse([]));
    vi.stubGlobal("fetch", fetchMock);
    const o = observer();
    const close = openFetchEventStream("https://events.test/s", { "x-queue-token": "qt_1" }, schemas, o);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(o.disconnected).toHaveBeenCalled();
    expect(fetchMock.mock.calls[1]![1].headers["last-event-id"]).toBe("7");
    close();
  });

  it("menutup stream menghentikan sambung ulang", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn().mockResolvedValue(streamResponse([]));
    vi.stubGlobal("fetch", fetchMock);
    const close = openFetchEventStream(
      "https://events.test/s",
      { "x-queue-token": "qt_1" },
      schemas,
      observer(),
    );
    await vi.advanceTimersByTimeAsync(0);
    close();
    await vi.advanceTimersByTimeAsync(120_000);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
