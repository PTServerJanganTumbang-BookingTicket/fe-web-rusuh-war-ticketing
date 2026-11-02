/**
 * Payment Mapper Tests - v2.1 Alignment
 *
 * Mapper disederhanakan di v2.1:
 * - Metode hardcoded (bank_transfer, gopay) — tidak perlu availableMethods dari API
 * - Bank selection dihapus dari UI (tidak ada selectedBank/onSelectBank)
 * - Domain "bank_transfer" → view "virtual_account", domain "gopay" → view "qr"
 */
import { describe, expect, it, vi } from "vitest";
import type { Order, PaymentMethod } from "../../domain/order.model";
import { toPaymentResultProps, toPaymentViewProps, type PaymentViewInput } from "../payment.mapper";

const order: Order = {
  bookingId: "RB-00912",
  eventName: "Konser A — Jakarta",
  items: [{ category: "VIP", priceIdr: 1_500_000, nikMasked: "3201•••••••0001" }],
  totalIdr: 1_500_000,
  paymentTtl: {
    expiresAt: "2026-10-19T10:10:00.000Z",
    ttlSeconds: 600,
    serverTime: "2026-10-19T10:00:00.000Z",
  },
  status: "PENDING_PAYMENT",
};

const input = (overrides: Partial<PaymentViewInput> = {}): PaymentViewInput => ({
  order,
  remainingMs: 582_000,
  selectedMethod: "bank_transfer" as PaymentMethod,
  paying: false,
  copied: false,
  onSelectMethod: vi.fn(),
  onPay: vi.fn(),
  onCopy: vi.fn(),
  ...overrides,
});

describe("toPaymentViewProps v2.1", () => {
  it("tahap pilih metode: header, countdown, dua metode, total, tombol bayar", () => {
    const view = toPaymentViewProps(input());
    expect(view.orderLabel).toContain("RB-00912");
    expect(view.countdown).toMatchObject({ value: "09:42", urgent: false });
    expect(view.methods?.options).toHaveLength(2);
    expect(view.methods?.options.map((o) => o.id)).toEqual(["bank_transfer", "gopay"]);
    expect(view.total.value).toContain("1.500.000");
    expect(view.pay?.disabled).toBe(false);
    expect(view.pending).toBeUndefined();
  });

  it("tombol bayar nonaktif saat memproses", () => {
    expect(toPaymentViewProps(input({ paying: true })).pay?.disabled).toBe(true);
  });

  it("tombol bayar nonaktif saat waktu habis", () => {
    expect(toPaymentViewProps(input({ remainingMs: 0 })).pay?.disabled).toBe(true);
  });

  it("tahap pending bank_transfer: menampilkan VA number sebagai virtual_account", () => {
    const pending: Order = {
      ...order,
      status: "AWAITING_PAYMENT",
      method: "bank_transfer",
      instruction: { type: "bank_transfer", bank: "bca", vaNumber: "8277081234567890" },
    };
    const view = toPaymentViewProps(input({ order: pending, copied: true }));
    expect(view.methods).toBeUndefined();
    expect(view.pay).toBeUndefined();
    expect(view.pending?.instruction).toMatchObject({
      type: "virtual_account",
      number: "8277081234567890",
    });
  });

  it("tahap pending gopay: menampilkan QR dengan seed dari qrUrl", () => {
    const pending: Order = {
      ...order,
      status: "AWAITING_PAYMENT",
      method: "gopay",
      instruction: { type: "gopay", qrUrl: "https://midtrans/qr/xyz", deeplinkUrl: "gojek://pay/xyz" },
    };
    const view = toPaymentViewProps(input({ order: pending }));
    expect(view.methods).toBeUndefined();
    expect(view.pay).toBeUndefined();
    expect(view.pending?.instruction).toMatchObject({
      type: "qr",
      seed: "https://midtrans/qr/xyz",
    });
  });
});

describe("toPaymentResultProps v2.1", () => {
  it("berhasil: header hijau, e-tiket, CTA lihat e-tiket", () => {
    const view = toPaymentResultProps({ ...order, status: "PAID" }, vi.fn(), vi.fn());
    expect(view).toMatchObject({ tone: "success" });
    expect(view.ticket).toBeDefined();
    expect(view.cta).toBeDefined();
  });

  it("expired: header merah dan kembali ke Home", () => {
    const expired = toPaymentResultProps({ ...order, status: "EXPIRED" }, vi.fn(), vi.fn());
    expect(expired).toMatchObject({ tone: "danger" });
    expect(expired.cta).toBeDefined();
  });

  it("failed: header merah dan kembali ke Home", () => {
    const failed = toPaymentResultProps({ ...order, status: "FAILED" }, vi.fn(), vi.fn());
    expect(failed).toMatchObject({ tone: "danger" });
    expect(failed.ticket).toBeUndefined();
    expect(failed.cta).toBeDefined();
  });
});
