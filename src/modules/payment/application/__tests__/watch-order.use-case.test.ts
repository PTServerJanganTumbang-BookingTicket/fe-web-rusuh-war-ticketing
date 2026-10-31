import { describe, expect, it, vi } from "vitest";
import { createWatchOrderUseCase } from "../watch-order.use-case";

describe("createWatchOrderUseCase", () => {
  it("meneruskan orderId dan observer ke protocol, dan mengembalikan unsubscribe-nya", () => {
    const unsubscribe = vi.fn();
    const watch = vi.fn(() => unsubscribe);
    const observer = { next: vi.fn(), connected: vi.fn(), disconnected: vi.fn() };
    const result = createWatchOrderUseCase({ orderUpdatesService: { watch } })("RB-1", observer);
    expect(watch).toHaveBeenCalledWith("RB-1", observer);
    expect(result).toBe(unsubscribe);
  });
});
