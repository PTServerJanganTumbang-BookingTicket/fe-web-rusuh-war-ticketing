import { describe, expect, it, vi } from "vitest";
import type { Order } from "@rusuh/core";
import type { PaymentScreenState } from "../paymentModel";
import { toPaymentViewProps } from "../toPaymentViewProps";

const order: Order = {
  orderId: "RB-00912",
  eventName: "Konser A — Jakarta",
  items: [{ name: "VIP", quantity: 1 }],
  totalIdr: 1_500_000,
  expiresAt: "2026-10-19T10:10:00.000Z",
  serverNow: "2026-10-19T10:00:00.000Z",
  status: "awaiting_method",
};

const actions = { selectMethod: vi.fn(), pay: vi.fn(), copy: vi.fn(), simulate: vi.fn(), openTicket: vi.fn(), goHome: vi.fn() };

type Paying = Extract<PaymentScreenState, { kind: "paying" }>;

const payment = (overrides: Partial<Paying> = {}) => {
  const screen = toPaymentViewProps({
    state: { kind: "paying", order, remainingMs: 582_000, method: "virtual_account", submitting: false, copied: false, ...overrides },
    actions,
  });
  if (screen.kind !== "payment") throw new Error("harus payment");
  return screen.view;
};

const result = (status: Order["status"]) => {
  const screen = toPaymentViewProps({ state: { kind: "settled", order: { ...order, status } }, actions });
  if (screen.kind !== "result") throw new Error("harus result");
  return screen.view;
};

describe("toPaymentViewProps: tahap bayar", () => {
  it("tahap pilih metode: header, countdown, tiga metode, total, tombol bayar", () => {
    const view = payment();
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
    expect(payment({ submitting: true }).pay?.disabled).toBe(true);
    expect(payment({ remainingMs: 0 }).pay?.disabled).toBe(true);
  });

  it("tahap pending dengan QR: tanpa pilihan metode, ada QR dan kontrol simulasi hanya bila mock", () => {
    const pending: Order = { ...order, status: "pending", method: "e_wallet", instruction: { type: "qr", payload: "rusuh-pay:RB-00912" } };
    const noMock = payment({ order: pending });
    expect(noMock.methods).toBeUndefined();
    expect(noMock.pay).toBeUndefined();
    expect(noMock.pending?.instruction).toMatchObject({ type: "qr", seed: "rusuh-pay:RB-00912" });
    expect(noMock.mockControls).toBeUndefined();

    const withMock = payment({ order: pending, simulation: { busy: false } });
    expect(withMock.mockControls?.success.label).toBe("Simulasikan berhasil");
    expect(withMock.mockControls?.fail.label).toBe("Simulasikan gagal");
    withMock.mockControls?.fail.onClick();
    expect(actions.simulate).toHaveBeenCalledWith("fail");
  });

  it("instruksi virtual account menampilkan nomor dan status tersalin", () => {
    const pending: Order = { ...order, status: "pending", instruction: { type: "virtual_account", bank: "BCA", number: "8277081234567890" } };
    const view = payment({ order: pending, copied: true });
    expect(view.pending?.instruction).toMatchObject({ type: "virtual_account", number: "8277081234567890", copy: { label: "Tersalin" } });
  });
});

describe("toPaymentViewProps: status akhir", () => {
  it("berhasil: header hijau, e-tiket, CTA lihat e-tiket", () => {
    const view = result("paid");
    expect(view).toMatchObject({ tone: "success", title: "Pembayaran Berhasil!", ticket: "e-Tiket ×1 — VIP" });
    expect(view.cta.label).toBe("Lihat E-Tiket");
    view.cta.onClick();
    expect(actions.openTicket).toHaveBeenCalledTimes(1);
  });

  it("expired dan gagal: header merah dan kembali ke Home", () => {
    expect(result("expired")).toMatchObject({ tone: "danger", headerLabel: "Expired", title: "Waktu Pembayaran Habis" });
    const failed = result("failed");
    expect(failed).toMatchObject({ tone: "danger", headerLabel: "Gagal", title: "Pembayaran Gagal" });
    expect(failed.ticket).toBeUndefined();
    expect(failed.cta.label).toBe("Kembali ke Home");
  });
});

describe("toPaymentViewProps: layar status", () => {
  it("loading netral, gagal jaringan memakai pesan i18n", () => {
    expect(toPaymentViewProps({ state: { kind: "loading" }, actions })).toMatchObject({ kind: "status", view: { tone: "neutral" } });
    expect(toPaymentViewProps({ state: { kind: "failed", error: { kind: "network" } }, actions })).toMatchObject({
      kind: "status",
      view: { tone: "error", message: "Koneksi bermasalah. Kami mencoba lagi otomatis." },
    });
  });
});
