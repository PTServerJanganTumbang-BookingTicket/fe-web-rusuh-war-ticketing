import { describe, expect, it, vi } from "vitest";
import { WatchOrderUseCase } from "../watch-order.use-case";

describe("WatchOrderUseCase", () => {
  it("meneruskan orderId dan observer ke protocol, dan mengembalikan unsubscribe-nya", () => {
    const unsubscribe = vi.fn();
    const watch = vi.fn(() => unsubscribe);
    const observer = { next: vi.fn(), connected: vi.fn(), disconnected: vi.fn() };
    const result = new WatchOrderUseCase({ orderUpdatesService: { watch } }).execute("RB-1", observer);
    expect(watch).toHaveBeenCalledWith("RB-1", observer);
    expect(result).toBe(unsubscribe);
  });
});
