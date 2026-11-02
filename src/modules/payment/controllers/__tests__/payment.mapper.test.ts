/**
 * Payment Mapper Tests - v2.1 Alignment
 *
 * NOTE: Most tests are commented out pending Task 14 (payment.controller.ts update).
 * The mapper has been updated but the full test suite requires MSW handlers
 * and controller updates to work end-to-end.
 */
import { describe, expect, it, vi } from "vitest";
import type { AvailableMethod, Order, BankCode, PaymentMethod } from "../../domain/order.model";
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

const availableMethods: AvailableMethod[] = [
  {
    id: "bank_transfer",
    name: "Bank Transfer",
    description: "Virtual Account",
    iconUrl: "/icons/va.png",
    enabled: true,
    banks: [
      { code: "bca", name: "BCA", iconUrl: "/icons/bca.png" },
      { code: "bni", name: "BNI", iconUrl: "/icons/bni.png" },
    ],
  },
  {
    id: "gopay",
    name: "GoPay",
    description: "E-Wallet",
    iconUrl: "/icons/gopay.png",
    enabled: true,
  },
];

const input = (overrides: Partial<PaymentViewInput> = {}): PaymentViewInput => ({
  order,
  remainingMs: 582_000,
  availableMethods,
  selectedMethod: "bank_transfer" as PaymentMethod,
  selectedBank: "bca" as BankCode,
  paying: false,
  copied: false,
  onSelectMethod: vi.fn(),
  onSelectBank: vi.fn(),
  onPay: vi.fn(),
  onCopy: vi.fn(),
  ...overrides,
});

describe("toPaymentViewProps v2.1", () => {
  it("tahap pilih metode: header, countdown, dua metode, total, tombol bayar", () => {
    const view = toPaymentViewProps(input());
    expect(view.orderLabel).toContain("RB-00912");
    expect(view.countdown).toMatchObject({ value: "09:42", urgent: false });
    // v2.1: hanya 2 metode (bank_transfer, gopay)
    expect(view.methods?.options).toHaveLength(2);
    expect(view.methods?.options.map((o) => o.id)).toEqual(["bank_transfer", "gopay"]);
    expect(view.total.value).toContain("1.500.000");
    expect(view.pay?.disabled).toBe(false);
    expect(view.pending).toBeUndefined();
  });

  it("tombol bayar nonaktif saat memproses atau waktu habis", () => {
    expect(toPaymentViewProps(input({ paying: true })).pay?.disabled).toBe(true);
    expect(toPaymentViewProps(input({ remainingMs: 0 })).pay?.disabled).toBe(true);
  });

  it("tombol bayar nonaktif jika bank_transfer dipilih tanpa bank", () => {
    const view = toPaymentViewProps(input({ selectedMethod: "bank_transfer", selectedBank: null }));
    expect(view.pay?.disabled).toBe(true);
  });

  it("tombol bayar aktif jika gopay dipilih (tidak perlu bank)", () => {
    const view = toPaymentViewProps(input({ selectedMethod: "gopay", selectedBank: null }));
    expect(view.pay?.disabled).toBe(false);
  });

  it("tahap pending bank_transfer: menampilkan VA number", () => {
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
      type: "bank_transfer",
      vaNumber: "8277081234567890",
    });
  });

  it("tahap pending gopay: menampilkan QR dan deeplink", () => {
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
      type: "gopay",
      qrUrl: "https://midtrans/qr/xyz",
      deeplinkUrl: "gojek://pay/xyz",
    });
  });
});

describe("toPaymentResultProps v2.1", () => {
  it("berhasil: header hijau, e-tiket, CTA lihat e-tiket", () => {
    const view = toPaymentResultProps({ ...order, status: "PAID" }, vi.fn(), vi.fn());
    expect(view).toMatchObject({
      tone: "success",
    });
    expect(view.ticket).toBeDefined();
    expect(view.cta).toBeDefined();
  });

  it("expired: header merah dan kembali ke Home", () => {
    const expired = toPaymentResultProps({ ...order, status: "EXPIRED" }, vi.fn(), vi.fn());
    expect(expired).toMatchObject({
      tone: "danger",
    });
    expect(expired.cta).toBeDefined();
  });

  it("failed: header merah dan kembali ke Home", () => {
    const failed = toPaymentResultProps({ ...order, status: "FAILED" }, vi.fn(), vi.fn());
    expect(failed).toMatchObject({
      tone: "danger",
    });
    expect(failed.ticket).toBeUndefined();
    expect(failed.cta).toBeDefined();
  });
});
