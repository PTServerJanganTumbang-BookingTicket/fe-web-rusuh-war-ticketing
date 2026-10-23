import { describe, expect, it } from "vitest";
import { setupApiServer } from "../../__tests__/support";
import { emulatePaymentOutcome, getOrder, startPayment } from "../payment";

setupApiServer();

describe("pembayaran", () => {
  it("order baru menunggu pemilihan metode", async () => {
    const order = await getOrder("RB-T1");
    expect(order).toMatchObject({ orderId: "RB-T1", status: "awaiting_method", totalIdr: 1_500_000 });
    expect(order.instruction).toBeUndefined();
  });

  it.each([
    ["virtual_account", "virtual_account"],
    ["e_wallet", "qr"],
    ["bank_transfer", "bank_transfer"],
  ] as const)("memilih %s menghasilkan instruksi %s dan status pending", async (method, type) => {
    const order = await startPayment(`RB-T2-${method}`, method);
    expect(order.status).toBe("pending");
    expect(order.instruction?.type).toBe(type);
  });

  it("simulasi berhasil dan gagal hanya berlaku saat pending", async () => {
    expect((await emulatePaymentOutcome("RB-T3", "success")).status).toBe("awaiting_method");
    await startPayment("RB-T3", "e_wallet");
    expect((await emulatePaymentOutcome("RB-T3", "success")).status).toBe("paid");

    await startPayment("RB-T4", "virtual_account");
    expect((await emulatePaymentOutcome("RB-T4", "fail")).status).toBe("failed");
  });

  it("status akhir tidak berubah lagi", async () => {
    await startPayment("RB-T5", "e_wallet");
    await emulatePaymentOutcome("RB-T5", "success");
    expect((await emulatePaymentOutcome("RB-T5", "fail")).status).toBe("paid");
  });
});
