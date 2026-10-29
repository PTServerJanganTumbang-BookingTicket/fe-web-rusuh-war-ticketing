import { describe, expect, it, vi } from "vitest";
import { WatchQueueStateUseCase } from "./watch-queue-state.use-case";

describe("WatchQueueStateUseCase", () => {
  it("meneruskan eventId dan observer ke protocol, dan mengembalikan unsubscribe-nya", () => {
    const unsubscribe = vi.fn();
    const watch = vi.fn(() => unsubscribe);
    const observer = { next: vi.fn(), connected: vi.fn(), disconnected: vi.fn() };
    const result = new WatchQueueStateUseCase({ queueUpdatesService: { watch } }).execute("evt-1", observer);
    expect(watch).toHaveBeenCalledWith("evt-1", observer);
    expect(result).toBe(unsubscribe);
  });
});
