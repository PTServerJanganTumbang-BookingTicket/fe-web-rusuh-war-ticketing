import { describe, expect, it, vi } from "vitest";
import type { HttpClient } from "@/core/data/http/http.client";
import { createHttpPaymentSimulatorService } from "../http-payment-simulator.service";

describe("createHttpPaymentSimulatorService", () => {
  it("settle memanggil webhook mock dengan format Midtrans: order_id, transaction_status, signature_key", async () => {
    const post = vi.fn(() => Promise.resolve(undefined));
    const service = createHttpPaymentSimulatorService({ httpClient: { post } as unknown as HttpClient });
    await service.settle("RB-77", "PAID");
    expect(post).toHaveBeenCalledTimes(1);
    const [path, body] = post.mock.calls[0] as unknown as [string, Record<string, string>];
    expect(path).toBe("/payments/webhook");
    expect(body).toMatchObject({
      order_id: "RB-77",
      transaction_status: "settlement",
      signature_key: "mock-signature",
    });
    await service.settle("RB-77", "FAILED");
    const [, failedBody] = post.mock.calls[1] as unknown as [string, Record<string, string>];
    expect(failedBody).toMatchObject({ order_id: "RB-77", transaction_status: "deny" });
  });
});
