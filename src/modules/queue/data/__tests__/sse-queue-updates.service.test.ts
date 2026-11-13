import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { EventStreamClient, StreamOptions } from "@/core/data/sse/event-stream.client";
import type { AppConfig } from "@/core/domain/app-config.model";
import type { CredentialStoreProtocol } from "@/core/domain/credential-store.protocol";
import type { Observer } from "@/core/domain/live-updates.protocol";
import type { QueueProtocol } from "../../domain/queue.protocol";
import type { QueueState } from "../../domain/queue-state.model";
import { createMemoryQueueTicketService } from "../memory-queue-ticket.service";
import { queueStreamSchemas, type QueueStreamMessage } from "../queue-state.schema";
import { createSseQueueUpdatesService } from "../sse-queue-updates.service";

const EVENT = "evt_1";
const ticket = { ticketNo: 100, joinedPosition: 100, eventName: "Konser A", ratePerMin: 0 };

const waiting = (position: number): QueueState => ({
  status: "waiting",
  eventName: "Konser A",
  fullBooked: false,
  stale: false,
  position,
  joinedPosition: 100,
  ratePerMin: 0,
  retryAfterMs: 5000,
});
const admitted: QueueState = {
  status: "admitted",
  eventName: "Konser A",
  accessToken: "gt_1",
  expiresAt: "x",
};

function setup(
  getOwnState: QueueProtocol["getOwnState"],
  withTicket = true,
  apiCredentials: "omit" | "include" = "include",
  gateway = false,
) {
  let push: Observer<QueueStreamMessage> | undefined;
  let options: StreamOptions | undefined;
  const closeStream = vi.fn();
  const client: EventStreamClient = {
    open: (_path, _schemas, observer, streamOptions) => {
      options = streamOptions;
      push = observer as Observer<QueueStreamMessage>;
      return closeStream;
    },
  };
  const cache = createMemoryQueueTicketService();
  if (withTicket) cache.set(EVENT, ticket);
  // Grant diambil lewat getOwnState (/queue/me); getState adalah polling cadangan /queue/serving dan tidak boleh dipakai.
  const getState = vi.fn();
  const queueService: QueueProtocol = {
    join: vi.fn(),
    getOwnState,
    getState,
    getEvent: vi.fn(),
    leave: vi.fn(),
  };
  const service = createSseQueueUpdatesService({
    eventStreamClient: client,
    queueService,
    queueTicketCache: cache,
    appConfig: {
      apiCredentials,
      mocking: !gateway,
      appBaseUrl: gateway ? "http://app.test" : "",
    } as AppConfig,
    credentialStore: {
      deviceId: () => "dev_1",
      queueToken: () => "qt_1",
    } as unknown as CredentialStoreProtocol,
  });
  const observer = { next: vi.fn(), connected: vi.fn(), disconnected: vi.fn() };
  const stop = service.watch(EVENT, observer);
  const tick = (nowServing: number) => push!.next({ type: "serving", nowServing, saleState: "OPEN" });
  return { observer, stop, tick, push: () => push!, closeStream, cache, getState, options: () => options };
}

describe("createSseQueueUpdatesService", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("mode cookie membuka stream tanpa header; omit dan route same-origin mengirim X-Queue-Token dan X-Device-Id", () => {
    const headers = { headers: { "x-queue-token": "qt_1", "x-device-id": "dev_1" } };
    expect(setup(vi.fn()).options()).toBeUndefined();
    expect(setup(vi.fn(), true, "omit").options()).toEqual(headers);
    expect(setup(vi.fn(), true, "include", true).options()).toEqual(headers);
  });

  it("meneruskan connected dan disconnected dari stream", () => {
    const { observer, push } = setup(vi.fn());
    push().connected();
    push().disconnected();
    expect(observer.connected).toHaveBeenCalledOnce();
    expect(observer.disconnected).toHaveBeenCalledOnce();
  });

  it("tanpa tiket tersimpan (sudah keluar antrian) pesan serving diabaikan", () => {
    const { observer, tick } = setup(vi.fn(), false);
    tick(50);
    expect(observer.next).not.toHaveBeenCalled();
  });

  it("laju dari stream menggantikan laju 0 saat join dan tersimpan di tiket untuk polling cadangan", () => {
    const { observer, push, cache } = setup(vi.fn());
    push().next({ type: "serving", nowServing: 50, saleState: "OPEN", ratePerMin: 0 });
    expect(observer.next).toHaveBeenLastCalledWith({ ...waiting(50), ratePerMin: 0 });

    push().next({ type: "serving", nowServing: 60, saleState: "OPEN", ratePerMin: 318 });
    expect(observer.next).toHaveBeenLastCalledWith({ ...waiting(40), ratePerMin: 318 });
    expect(cache.get(EVENT)?.ratePerMin).toBe(318);
  });

  it("pesan tanpa laju mempertahankan laju terakhir", () => {
    const { observer, push, tick } = setup(vi.fn());
    push().next({ type: "serving", nowServing: 50, saleState: "OPEN", ratePerMin: 200 });
    tick(60);
    expect(observer.next).toHaveBeenLastCalledWith({ ...waiting(40), ratePerMin: 200 });
  });

  it("giliran tiba tetapi grant belum terbaca (QUEUED posisi 0): ulang /queue/me tiap 1 detik sampai admitted", async () => {
    const getOwnState = vi.fn().mockResolvedValueOnce(waiting(0)).mockResolvedValueOnce(admitted);
    const { observer, tick } = setup(getOwnState);
    tick(100);
    await vi.advanceTimersByTimeAsync(0);
    expect(getOwnState).toHaveBeenCalledTimes(1);
    expect(observer.next).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1000);
    expect(getOwnState).toHaveBeenCalledTimes(2);
    expect(observer.next).toHaveBeenCalledWith(admitted);
  });

  it("grant diambil lewat getOwnState, bukan polling /queue/serving", async () => {
    const getOwnState = vi.fn().mockResolvedValue(admitted);
    const { tick, getState } = setup(getOwnState);
    tick(100);
    await vi.advanceTimersByTimeAsync(0);
    expect(getOwnState).toHaveBeenCalledWith(EVENT);
    expect(getState).not.toHaveBeenCalled();
  });

  it("pesan serving berikutnya tidak menggandakan pengambilan grant yang sedang diulang", async () => {
    const getOwnState = vi.fn().mockResolvedValue(waiting(0));
    const { tick } = setup(getOwnState);
    tick(100);
    await vi.advanceTimersByTimeAsync(0);
    tick(101);
    tick(102);
    expect(getOwnState).toHaveBeenCalledTimes(1);
  });

  it("gagal mengambil grant dilaporkan sebagai putus (controller kembali ke polling)", async () => {
    const { observer, tick } = setup(vi.fn().mockRejectedValue(new Error("offline")));
    tick(100);
    await vi.advanceTimersByTimeAsync(0);
    expect(observer.disconnected).toHaveBeenCalledOnce();
    expect(observer.next).not.toHaveBeenCalled();
  });

  it("berhenti menonton: stream ditutup dan ulangan grant dibatalkan", async () => {
    const getOwnState = vi.fn().mockResolvedValue(waiting(0));
    const { stop, tick, closeStream } = setup(getOwnState);
    tick(100);
    await vi.advanceTimersByTimeAsync(0);
    stop();
    await vi.advanceTimersByTimeAsync(5000);
    expect(closeStream).toHaveBeenCalledOnce();
    expect(getOwnState).toHaveBeenCalledTimes(1);
  });

  it("hasil grant yang tiba setelah berhenti menonton tidak diteruskan", async () => {
    let resolve: (state: QueueState) => void = () => {};
    const getOwnState = vi.fn().mockReturnValue(new Promise<QueueState>((done) => (resolve = done)));
    const { observer, stop, tick } = setup(getOwnState);
    tick(100);
    stop();
    resolve(admitted);
    await vi.advanceTimersByTimeAsync(0);
    expect(observer.next).not.toHaveBeenCalled();
  });

  it("gagal setelah berhenti menonton tidak melaporkan putus", async () => {
    let reject: (error: Error) => void = () => {};
    const getOwnState = vi.fn().mockReturnValue(new Promise<QueueState>((_, fail) => (reject = fail)));
    const { observer, stop, tick } = setup(getOwnState);
    tick(100);
    stop();
    reject(new Error("x"));
    await vi.advanceTimersByTimeAsync(0);
    expect(observer.disconnected).not.toHaveBeenCalled();
  });

  it("skema stream menolak state di luar kontrak dan nowServing non-angka", () => {
    expect(queueStreamSchemas.message.safeParse({ nowServing: 1, state: "PAUSED" }).success).toBe(false);
    expect(queueStreamSchemas.message.safeParse({ nowServing: "1", state: "OPEN" }).success).toBe(false);
    expect(queueStreamSchemas.message.parse({ nowServing: 1, state: "OPEN", ratePerMin: 318 })).toEqual({
      type: "serving",
      nowServing: 1,
      saleState: "OPEN",
      ratePerMin: 318,
    });
    expect(queueStreamSchemas.status.safeParse({ state: "FULL_BOOKED" }).success).toBe(true);
    expect(queueStreamSchemas.stale.safeParse({ stale: true, state: "OPEN" }).success).toBe(true);
    expect(queueStreamSchemas.reconnect.safeParse({ state: "OPEN" }).success).toBe(true);
  });
});
