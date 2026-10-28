import { describe, expect, it, vi } from "vitest";
import { WatchQueueState } from "./WatchQueueState";

describe("WatchQueueState", () => {
  it("meneruskan eventId dan observer ke port, dan mengembalikan unsubscribe-nya", () => {
    const unsubscribe = vi.fn();
    const watch = vi.fn(() => unsubscribe);
    const observer = { next: vi.fn(), connected: vi.fn(), disconnected: vi.fn() };
    const result = new WatchQueueState({ queueUpdates: { watch } }).execute("evt-1", observer);
    expect(watch).toHaveBeenCalledWith("evt-1", observer);
    expect(result).toBe(unsubscribe);
  });
});
