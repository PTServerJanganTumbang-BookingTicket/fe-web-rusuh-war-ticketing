import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { EventStreamClient } from "@/core/data/sse/event-stream.client";
import type { Observer } from "@/core/domain/live-updates.protocol";
import type { QueueProtocol } from "../../domain/queue.protocol";
import type { QueueState } from "../../domain/queue-state.model";
import { createMemoryQueueTicketService } from "../memory-queue-ticket.service";
import { queueStreamSchemas, type QueueStreamMessage } from "../queue-state.schema";
import { createSseQueueUpdatesService } from "../sse-queue-updates.service";

const EVENT = "evt_1";
const ticket = { ticketNo: 100, joinedPosition: 100, eventName: "Konser A", secondsPerPosition: 0.2 };

const waiting = (position: number): QueueState => ({
  status: "waiting",
  eventName: "Konser A",
  fullBooked: false,
  stale: false,
  position,
  joinedPosition: 100,
  etaSeconds: 0,
  retryAfterMs: 5000,
});
const admitted: QueueState = {
  status: "admitted",
  eventName: "Konser A",
  accessToken: "gt_1",
  expiresAt: "x",
};

function setup(getState: QueueProtocol["getState"], withTicket = true) {
  let push: Observer<QueueStreamMessage> | undefined;
  const closeStream = vi.fn();
  const client: EventStreamClient = {
    open: (_path, _schemas, observer) => {
      push = observer as Observer<QueueStreamMessage>;
      return closeStream;
    },
  };
  const cache = createMemoryQueueTicketService();
  if (withTicket) cache.set(EVENT, ticket);
  const queueService = { getState, getEvent: vi.fn(), leave: vi.fn() } as QueueProtocol;
  const service = createSseQueueUpdatesService({
    eventStreamClient: client,
    queueService,
    queueTicketCache: cache,
  });
  const observer = { next: vi.fn(), connected: vi.fn(), disconnected: vi.fn() };
  const stop = service.watch(EVENT, observer);
  const tick = (nowServing: number) => push!.next({ type: "serving", nowServing, saleState: "OPEN" });
  return { observer, stop, tick, push: () => push!, closeStream };
}

describe("createSseQueueUpdatesService", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("meneruskan connected dan disconnected dari stream", () => {
    const { observer, push } = setup(vi.fn());
    push().connected();
    push().disconnected();
    expect(observer.connected).toHaveBeenCalledOnce();
    expect(observer.disconnected).toHaveBeenCalledOnce();
  });

  it("sebelum join selesai (tiket belum ada) pesan serving diabaikan", () => {
    const { observer, tick } = setup(vi.fn(), false);
    tick(50);
    expect(observer.next).not.toHaveBeenCalled();
  });

  it("giliran tiba tetapi grant belum terbaca (QUEUED posisi 0): ulang /queue/me tiap 1 detik sampai admitted", async () => {
    const getState = vi.fn().mockResolvedValueOnce(waiting(0)).mockResolvedValueOnce(admitted);
    const { observer, tick } = setup(getState);
    tick(100);
    await vi.advanceTimersByTimeAsync(0);
    expect(getState).toHaveBeenCalledTimes(1);
    expect(observer.next).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1000);
    expect(getState).toHaveBeenCalledTimes(2);
    expect(observer.next).toHaveBeenCalledWith(admitted);
  });

  it("pesan serving berikutnya tidak menggandakan pengambilan grant yang sedang diulang", async () => {
    const getState = vi.fn().mockResolvedValue(waiting(0));
    const { tick } = setup(getState);
    tick(100);
    await vi.advanceTimersByTimeAsync(0);
    tick(101);
    tick(102);
    expect(getState).toHaveBeenCalledTimes(1);
  });

  it("gagal mengambil grant dilaporkan sebagai putus (controller kembali ke polling)", async () => {
    const { observer, tick } = setup(vi.fn().mockRejectedValue(new Error("offline")));
    tick(100);
    await vi.advanceTimersByTimeAsync(0);
    expect(observer.disconnected).toHaveBeenCalledOnce();
    expect(observer.next).not.toHaveBeenCalled();
  });

  it("berhenti menonton: stream ditutup dan ulangan grant dibatalkan", async () => {
    const getState = vi.fn().mockResolvedValue(waiting(0));
    const { stop, tick, closeStream } = setup(getState);
    tick(100);
    await vi.advanceTimersByTimeAsync(0);
    stop();
    await vi.advanceTimersByTimeAsync(5000);
    expect(closeStream).toHaveBeenCalledOnce();
    expect(getState).toHaveBeenCalledTimes(1);
  });

  it("hasil grant yang tiba setelah berhenti menonton tidak diteruskan", async () => {
    let resolve: (state: QueueState) => void = () => {};
    const getState = vi.fn().mockReturnValue(new Promise<QueueState>((done) => (resolve = done)));
    const { observer, stop, tick } = setup(getState);
    tick(100);
    stop();
    resolve(admitted);
    await vi.advanceTimersByTimeAsync(0);
    expect(observer.next).not.toHaveBeenCalled();
  });

  it("gagal setelah berhenti menonton tidak melaporkan putus", async () => {
    let reject: (error: Error) => void = () => {};
    const getState = vi.fn().mockReturnValue(new Promise<QueueState>((_, fail) => (reject = fail)));
    const { observer, stop, tick } = setup(getState);
    tick(100);
    stop();
    reject(new Error("x"));
    await vi.advanceTimersByTimeAsync(0);
    expect(observer.disconnected).not.toHaveBeenCalled();
  });

  it("skema stream menolak state di luar kontrak dan nowServing non-angka", () => {
    expect(queueStreamSchemas.message.safeParse({ nowServing: 1, state: "PAUSED" }).success).toBe(false);
    expect(queueStreamSchemas.message.safeParse({ nowServing: "1", state: "OPEN" }).success).toBe(false);
    expect(queueStreamSchemas.status.safeParse({ state: "FULL_BOOKED" }).success).toBe(true);
    expect(queueStreamSchemas.stale.safeParse({ stale: true, state: "OPEN" }).success).toBe(true);
    expect(queueStreamSchemas.reconnect.safeParse({ state: "OPEN" }).success).toBe(true);
  });
});
