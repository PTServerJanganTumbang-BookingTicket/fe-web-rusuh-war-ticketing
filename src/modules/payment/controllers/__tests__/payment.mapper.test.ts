import { describe, expect, it, vi } from "vitest";
import { toSiteChrome } from "@/core/controllers/site-chrome.utils";
import type { AvailableMethod, Order } from "../../domain/order.model";
import { toPaymentViewProps, type PaymentViewInput } from "../payment.mapper";

const order: Order = {
  bookingId: "RB-00912",
  eventId: "evt_konser_a",
  eventName: "Konser A — Jakarta",
  items: [
    { category: "VIP", priceIdr: 1_500_000, nikMasked: "3201•••••••0001" },
    { category: "VIP", priceIdr: 1_500_000, nikMasked: "3201•••••••0002" },
    { category: "Festival", priceIdr: 850_000, nikMasked: "3201•••••••0003" },
  ],
  totalIdr: 3_850_000,
  paymentTtl: {
    expiresAt: "2026-10-19T10:10:00.000Z",
    ttlSeconds: 600,
    serverTime: "2026-10-19T10:00:00.000Z",
  },
  status: "PENDING_PAYMENT",
};

const methods: AvailableMethod[] = [
  {
    id: "bank_transfer",
    name: "Virtual Account",
    description: "",
    iconUrl: "",
    enabled: true,
    banks: [
      { code: "bca", name: "BCA", iconUrl: "" },
      { code: "bni", name: "BNI", iconUrl: "" },
    ],
  },
  { id: "gopay", name: "GoPay", description: "", iconUrl: "", enabled: false },
];

const input = (overrides: Partial<PaymentViewInput> = {}): PaymentViewInput => ({
  chrome: toSiteChrome(),
  order,
  event: {
    name: "Konser A",
    category: "LIVE MUSIC",
    city: "Jakarta",
    venue: "GBK",
    date: "2026-12-25",
    imageUrl: "/images/concert-placeholder.webp",
  },
  methods,
  selectedMethod: null,
  selectedBank: null,
  bankMissing: false,
  remainingMs: 582_000,
  paying: false,
  copied: false,
  onSelectMethod: vi.fn(),
  onSelectBank: vi.fn(),
  onPay: vi.fn(),
  onCopy: vi.fn(),
  ...overrides,
});

const stageOf = (view: ReturnType<typeof toPaymentViewProps>, kind: "select" | "pending" | "result") => {
  if (view.stage.kind !== kind) throw new Error(`stage ${view.stage.kind}, bukan ${kind}`);
  return view.stage as never;
};

describe("toPaymentViewProps", () => {
  it("tahap pilih metode: langkah 2 dari 3, countdown, ringkasan per kategori", () => {
    const view = toPaymentViewProps(input());
    expect(view.header.heading).toBe("Satu langkah menuju panggung.");
    expect(view.header.steps?.map((step) => step.state)).toEqual(["done", "current", "upcoming"]);
    expect(view.order).toMatchObject({ status: { label: "Menunggu bayar", tone: "warning" } });
    expect(view.order.label).toContain("RB-00912");
    expect(view.countdown).toMatchObject({ value: "09:42", urgent: false });
    expect(view.summary.lines.map((line) => line.label)).toEqual(["VIP × 2", "Festival × 1"]);
    expect(view.summary.total).toContain("3.850.000");
    expect(view.terms).toBeDefined();
  });

  it("metode dari server; metode mati ditandai tidak tersedia", () => {
    const stage: Extract<ReturnType<typeof toPaymentViewProps>["stage"], { kind: "select" }> = stageOf(
      toPaymentViewProps(input()),
      "select",
    );
    expect(stage.methods.map((method) => [method.title, method.disabled])).toEqual([
      ["Virtual Account", false],
      ["E-Wallet", true],
    ]);
    expect(stage.methods[1]?.description).toBe("Sedang tidak tersedia");
    expect(stage.banks).toBeUndefined();
  });

  it("Virtual Account menampilkan pilihan bank dan galat bila bank belum dipilih", () => {
    const view = toPaymentViewProps(
      input({ selectedMethod: "bank_transfer", selectedBank: "bni", bankMissing: true }),
    );
    const stage: Extract<typeof view.stage, { kind: "select" }> = stageOf(view, "select");
    expect(stage.banks?.options.map((bank) => [bank.name, bank.selected])).toEqual([
      ["BCA", false],
      ["BNI", true],
    ]);
    expect(stage.banks?.error).toBe("Pilih bank untuk Virtual Account.");
    expect(stage.note).toContain("Virtual Account");
  });

  it("tombol bayar mati tanpa metode, saat memproses, atau saat waktu habis", () => {
    expect(toPaymentViewProps(input()).pay?.disabled).toBe(true);
    expect(toPaymentViewProps(input({ selectedMethod: "bank_transfer" })).pay?.disabled).toBe(false);
    expect(toPaymentViewProps(input({ selectedMethod: "bank_transfer", paying: true })).pay?.disabled).toBe(
      true,
    );
    expect(toPaymentViewProps(input({ selectedMethod: "bank_transfer", remainingMs: 0 })).pay?.disabled).toBe(
      true,
    );
  });

  it("pending VA: nomor VA dengan tombol salin dan kontrol mock", () => {
    const onCopy = vi.fn();
    const onSuccess = vi.fn();
    const view = toPaymentViewProps(
      input({
        order: {
          ...order,
          status: "AWAITING_PAYMENT",
          instruction: { type: "bank_transfer", bank: "bca", vaNumber: "8808123456789" },
        },
        onCopy,
        mock: { onSuccess, onFail: vi.fn(), busy: false },
      }),
    );
    const stage: Extract<typeof view.stage, { kind: "pending" }> = stageOf(view, "pending");
    expect(stage.instruction).toMatchObject({ type: "virtual_account", number: "8808123456789" });
    if (stage.instruction.type !== "virtual_account") throw new Error("bukan VA");
    stage.instruction.copy.onClick();
    expect(onCopy).toHaveBeenCalledWith("8808123456789");
    stage.mock?.success.onClick();
    expect(onSuccess).toHaveBeenCalled();
    expect(view.pay).toBeUndefined();
  });

  it("pending GoPay: QR dan tautan aplikasi", () => {
    const view = toPaymentViewProps(
      input({
        order: {
          ...order,
          status: "AWAITING_PAYMENT",
          instruction: { type: "gopay", qrUrl: "https://qr.example/1", deeplinkUrl: "gojek://pay/1" },
        },
      }),
    );
    const stage: Extract<typeof view.stage, { kind: "pending" }> = stageOf(view, "pending");
    expect(stage.instruction).toMatchObject({ type: "qr", openApp: { href: "gojek://pay/1" } });
  });

  it("gagal: kembali ke pilih metode dengan pemberitahuan, timer tetap jalan", () => {
    const view = toPaymentViewProps(input({ order: { ...order, status: "FAILED" } }));
    const stage: Extract<typeof view.stage, { kind: "select" }> = stageOf(view, "select");
    expect(stage.failedNotice).toContain("gagal");
    expect(view.countdown).toBeDefined();
    expect(view.order.status.tone).toBe("error");
  });

  it("lunas: semua langkah selesai, tanpa timer, CTA ke e-tiket", () => {
    const view = toPaymentViewProps(input({ order: { ...order, status: "PAID" } }));
    const stage: Extract<typeof view.stage, { kind: "result" }> = stageOf(view, "result");
    expect(view.header.steps?.map((step) => step.state)).toEqual(["done", "done", "current"]);
    expect(view.countdown).toBeUndefined();
    expect(stage).toMatchObject({
      tone: "success",
      title: "Pembayaran Berhasil!",
      detail: "e-Tiket ×3 — VIP, Festival",
    });
    expect(stage.primary.href).toBe("/tickets");
  });

  it("kedaluwarsa: kembali ke beranda", () => {
    const view = toPaymentViewProps(input({ order: { ...order, status: "EXPIRED" } }));
    const stage: Extract<typeof view.stage, { kind: "result" }> = stageOf(view, "result");
    expect(stage.primary.href).toBe("/");
    expect(view.countdown).toBeUndefined();
    expect(view.header.subtitle).toBe("Batas waktu pembayaran sudah lewat.");
  });
});
