import { describe, expect, it, vi } from "vitest";
import type { HttpClient } from "@/core/data/http/http.client";
import { createHttpPaymentSimulatorService } from "../http-payment-simulator.service";

describe("createHttpPaymentSimulatorService", () => {
  it("settle memanggil webhook mock dengan external_id, status, dan tanda tangan", async () => {
    const post = vi.fn(() => Promise.resolve(undefined));
    const service = createHttpPaymentSimulatorService({ httpClient: { post } as unknown as HttpClient });
    await service.settle("RB-77", "PAID");
    expect(post).toHaveBeenCalledTimes(1);
    const [path, body, , options] = post.mock.calls[0] as unknown as [string, unknown, unknown, unknown];
    expect(path).toBe("/payments/webhook");
    expect(body).toEqual({ external_id: "RB-77", status: "PAID" });
    expect(options).toEqual({ headers: { "x-callback-signature": "mock-signature" } });
  });
});
