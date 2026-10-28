import { describe, expect, it, vi } from "vitest";
import { WatchOrder } from "./WatchOrder";

describe("WatchOrder", () => {
  it("meneruskan orderId dan observer ke port, dan mengembalikan unsubscribe-nya", () => {
    const unsubscribe = vi.fn();
    const watch = vi.fn(() => unsubscribe);
    const observer = { next: vi.fn(), connected: vi.fn(), disconnected: vi.fn() };
    const result = new WatchOrder({ orderUpdates: { watch } }).execute("RB-1", observer);
    expect(watch).toHaveBeenCalledWith("RB-1", observer);
    expect(result).toBe(unsubscribe);
  });
});
