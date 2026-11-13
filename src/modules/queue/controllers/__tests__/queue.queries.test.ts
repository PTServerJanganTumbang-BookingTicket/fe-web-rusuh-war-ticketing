import { describe, expect, it, vi } from "vitest";
import { queueJoinQuery } from "../queue.queries";

describe("queueJoinQuery", () => {
  it("tidak join ulang saat jaringan tersambung kembali, tetap basi saat dipasang ulang", async () => {
    const joinQueueUseCase = vi.fn().mockResolvedValue({ status: "waiting" });
    const options = queueJoinQuery({ joinQueueUseCase }, "evt_1");
    expect(options.refetchOnReconnect).toBe(false);
    expect(options.staleTime).toBe(0);
    await (options.queryFn as () => Promise<unknown>)();
    expect(joinQueueUseCase).toHaveBeenCalledWith("evt_1");
  });
});
