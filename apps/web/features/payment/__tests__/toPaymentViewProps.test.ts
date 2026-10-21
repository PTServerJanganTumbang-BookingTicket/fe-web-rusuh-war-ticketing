import { describe, expect, it, vi } from "vitest";
import type { Order } from "@rusuh/core";
import { toPaymentResultProps, toPaymentViewProps, type PaymentViewInput } from "../toPaymentViewProps";

const order: Order = {
  orderId: "RB-00912",
  eventName: "Konser A — Jakarta",
  items: [{ name: "VIP", quantity: 1 }],
  totalIdr: 1_500_000,
  expiresAt: "2026-10-19T10:10:00.000Z",
  serverNow: "2026-10-19T10:00:00.000Z",
  status: "awaiting_method",
};

const input = (overrides: Partial<PaymentViewInput> = {}): PaymentViewInput => ({
  order,
  remainingMs: 582_000,
  method: "virtual_account",
  paying: false,
  copied: false,
  onSelectMethod: vi.fn(),
  onPay: vi.fn(),
  onCopy: vi.fn(),
  ...overrides,
});

describe("toPaymentViewProps", () => {
  it("tahap pilih metode: header, countdown, tiga metode, total, tombol bayar", () => {
    const view = toPaymentViewProps(input());
    expect(view.orderLabel).toBe("Order #RB-00912");
    expect(view.countdown).toMatchObject({ value: "09:42", urgent: false });
    expect(view.methods?.options.map((o) => [o.label, o.selected])).toEqual([
      ["Virtual Account", true],
      ["E-Wallet", false],
      ["Transfer Bank", false],
    ]);
    expect(view.total.value).toContain("1.500.000");
    expect(view.pay).toMatchObject({ label: "Bayar Sekarang", disabled: false });
    expect(view.pending).toBeUndefined();
  });

  it("tombol bayar nonaktif saat memproses atau waktu habis", () => {
    expect(toPaymentViewProps(input({ paying: true })).pay?.disabled).toBe(true);
    expect(toPaymentViewProps(input({ remainingMs: 0 })).pay?.disabled).toBe(true);
  });

  it("tahap pending dengan QR: tanpa pilihan metode, ada QR dan kontrol simulasi hanya bila mock", () => {
    const pending: Order = { ...order, status: "pending", method: "e_wallet", instruction: { type: "qr", payload: "rusuh-pay:RB-00912" } };
    const noMock = toPaymentViewProps(input({ order: pending }));
    expect(noMock.methods).toBeUndefined();
    expect(noMock.pay).toBeUndefined();
    expect(noMock.pending?.instruction).toMatchObject({ type: "qr", seed: "rusuh-pay:RB-00912" });
    expect(noMock.mockControls).toBeUndefined();

    const withMock = toPaymentViewProps(input({ order: pending, mock: { onSuccess: vi.fn(), onFail: vi.fn(), busy: false } }));
    expect(withMock.mockControls?.success.label).toBe("Simulasikan berhasil");
    expect(withMock.mockControls?.fail.label).toBe("Simulasikan gagal");
  });

  it("instruksi virtual account menampilkan nomor dan status tersalin", () => {
    const pending: Order = { ...order, status: "pending", instruction: { type: "virtual_account", bank: "BCA", number: "8277081234567890" } };
    const view = toPaymentViewProps(input({ order: pending, copied: true }));
    expect(view.pending?.instruction).toMatchObject({ type: "virtual_account", number: "8277081234567890", copy: { label: "Tersalin" } });
  });
});

describe("toPaymentResultProps", () => {
  it("berhasil: header hijau, e-tiket, CTA lihat e-tiket", () => {
    const view = toPaymentResultProps({ ...order, status: "paid" }, vi.fn(), vi.fn());
    expect(view).toMatchObject({ tone: "success", title: "Pembayaran Berhasil!", ticket: "e-Tiket ×1 — VIP" });
    expect(view.cta.label).toBe("Lihat E-Tiket");
  });

  it("expired dan gagal: header merah dan kembali ke Home", () => {
    const expired = toPaymentResultProps({ ...order, status: "expired" }, vi.fn(), vi.fn());
    expect(expired).toMatchObject({ tone: "danger", headerLabel: "Expired", title: "Waktu Pembayaran Habis" });
    const failed = toPaymentResultProps({ ...order, status: "failed" }, vi.fn(), vi.fn());
    expect(failed).toMatchObject({ tone: "danger", headerLabel: "Gagal", title: "Pembayaran Gagal" });
    expect(failed.ticket).toBeUndefined();
    expect(failed.cta.label).toBe("Kembali ke Home");
  });
});
