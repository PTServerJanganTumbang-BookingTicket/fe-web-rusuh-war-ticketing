// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { asValue } from "awilix";
import { AppFailure } from "@/core/domain/app-error";
import { createWrapper, setupTestContainer, testConfig } from "@/test/support";
import type { AvailableMethod, Order } from "../../domain/order.model";
import type { PaymentViewProps } from "../../views/PaymentView";
import { usePaymentController, type PaymentScreen } from "../payment.controller";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace }) }));

const METHODS: AvailableMethod[] = [
  {
    id: "bank_transfer",
    name: "Virtual Account",
    description: "VA",
    iconUrl: "/va.svg",
    enabled: true,
    banks: [
      { code: "bca", name: "BCA", iconUrl: "/bca.svg" },
      { code: "bni", name: "BNI", iconUrl: "/bni.svg" },
    ],
  },
  { id: "gopay", name: "E-Wallet", description: "QR", iconUrl: "/gopay.svg", enabled: true },
];

function makeOrder(overrides: Partial<Order> = {}): Order {
  const now = Date.now();
  return {
    bookingId: "RB-T1",
    eventId: "evt_konser_a",
    eventName: "Konser A",
    items: [
      { category: "VIP", priceIdr: 1_500_000, nikMasked: "3171••••••••0022" },
      { category: "VIP", priceIdr: 1_500_000, nikMasked: "3171••••••••0033" },
    ],
    totalIdr: 3_000_000,
    paymentTtl: {
      expiresAt: new Date(now + 600_000).toISOString(),
      ttlSeconds: 600,
      serverTime: new Date(now).toISOString(),
    },
    status: "PENDING_PAYMENT",
    ...overrides,
  };
}

const awaiting = (order: Order): Order => ({
  ...order,
  status: "AWAITING_PAYMENT",
  method: "bank_transfer",
  instruction: { type: "bank_transfer", bank: "bca", vaNumber: "8801000000912" },
});

type Fakes = {
  getOrder?: ReturnType<typeof vi.fn>;
  start?: ReturnType<typeof vi.fn>;
  retry?: ReturnType<typeof vi.fn>;
  simulate?: ReturnType<typeof vi.fn>;
  mocking?: boolean;
};

function mount(order: Order | Error, fakes: Fakes = {}) {
  const getOrder =
    fakes.getOrder ?? vi.fn(() => (order instanceof Error ? Promise.reject(order) : Promise.resolve(order)));
  const start = fakes.start ?? vi.fn(() => Promise.resolve(awaiting(order as Order)));
  const retry = fakes.retry ?? vi.fn(() => Promise.resolve(makeOrder()));
  const simulate = fakes.simulate ?? vi.fn(() => Promise.resolve());
  const container = setupTestContainer(
    {
      getOrderUseCase: asValue(getOrder),
      getAvailableMethodsUseCase: asValue(() => Promise.resolve(METHODS)),
      getPaymentEventUseCase: asValue(() => Promise.reject(new Error("tanpa event"))),
      startPaymentUseCase: asValue(start),
      retryPaymentUseCase: asValue(retry),
      simulatePaymentUseCase: asValue(simulate),
    } as never,
    { ...testConfig, mocking: fakes.mocking ?? true },
  );
  const hook = renderHook(() => usePaymentController("RB-T1"), { wrapper: createWrapper(container) });
  const payment = (): PaymentViewProps => {
    const screen: PaymentScreen = hook.result.current;
    if (screen.kind !== "payment") throw new Error("belum siap");
    return screen.view;
  };
  const select = () => {
    const stage = payment().stage;
    if (stage.kind !== "select") throw new Error("bukan select");
    return stage;
  };
  return { ...hook, payment, select, getOrder, start, retry, simulate };
}

beforeEach(() => vi.clearAllMocks());

describe("usePaymentController", () => {
  it("memuat order lalu menampilkan pilihan metode dan total", async () => {
    const { result, payment, select } = mount(makeOrder());
    expect(result.current.kind).toBe("status");
    await waitFor(() => expect(result.current.kind).toBe("payment"));
    expect(select().methods).toHaveLength(2);
    expect(payment().summary.total).toContain("3.000.000");
    expect(payment().pay?.disabled).toBeDefined();
  });

  it("galat jaringan saat memuat order menampilkan layar status error", async () => {
    const { result } = mount(new AppFailure({ kind: "network" }), {});
    await waitFor(() => expect(result.current.kind).toBe("status"));
    await waitFor(() => {
      if (result.current.kind !== "status") throw new Error("bukan status");
      expect(result.current.view.tone).toBe("error");
    });
  });

  it("bayar tanpa memilih metode tidak mengirim request", async () => {
    const { payment, start } = mount(makeOrder());
    await waitFor(() => expect(payment).not.toThrow());
    act(() => payment().pay?.onClick());
    expect(start).not.toHaveBeenCalled();
  });

  it("bank_transfer tanpa bank menampilkan galat bank, lalu bayar dengan bank terpilih", async () => {
    const { payment, select, start } = mount(makeOrder());
    await waitFor(() => expect(payment).not.toThrow());
    act(() =>
      select()
        .methods.find((method) => method.id === "bank_transfer")
        ?.onSelect(),
    );
    act(() => payment().pay?.onClick());
    expect(start).not.toHaveBeenCalled();
    expect(select().banks?.error).toBeDefined();

    act(() =>
      select()
        .banks?.options.find((bank) => bank.code === "bca")
        ?.onSelect(),
    );
    expect(select().banks?.error).toBeUndefined();
    act(() => payment().pay?.onClick());
    await waitFor(() => expect(start).toHaveBeenCalled());
    expect(start.mock.calls[0]?.[0]).toEqual({ bookingId: "RB-T1", method: "bank_transfer", bank: "bca" });
    await waitFor(() => expect(payment().stage.kind).toBe("pending"));
  });

  it("gopay: bayar tanpa bank", async () => {
    const { payment, select, start } = mount(makeOrder());
    await waitFor(() => expect(payment).not.toThrow());
    act(() =>
      select()
        .methods.find((method) => method.id === "gopay")
        ?.onSelect(),
    );
    act(() => payment().pay?.onClick());
    await waitFor(() => expect(start).toHaveBeenCalled());
    expect(start.mock.calls[0]?.[0]).toEqual({ bookingId: "RB-T1", method: "gopay", bank: undefined });
  });

  it("order FAILED tetap menampilkan metode dan memakai retry, bukan start", async () => {
    const { payment, select, retry, start } = mount(makeOrder({ status: "FAILED" }));
    await waitFor(() => expect(select().methods).toHaveLength(2));
    expect(select().failedNotice).toBeDefined();
    act(() =>
      select()
        .methods.find((method) => method.id === "gopay")
        ?.onSelect(),
    );
    act(() => payment().pay?.onClick());
    await waitFor(() => expect(retry).toHaveBeenCalled());
    expect(retry.mock.calls[0]?.[0]).toEqual({ bookingId: "RB-T1", method: "gopay", bank: undefined });
    expect(start).not.toHaveBeenCalled();
  });

  it("galat jaringan saat bayar membuka dialog; coba lagi mengirim ulang pilihan yang sama", async () => {
    const start = vi
      .fn()
      .mockRejectedValueOnce(new AppFailure({ kind: "network" }))
      .mockResolvedValueOnce(awaiting(makeOrder()));
    const { payment, select } = mount(makeOrder(), { start });
    await waitFor(() => expect(payment).not.toThrow());
    act(() =>
      select()
        .methods.find((method) => method.id === "gopay")
        ?.onSelect(),
    );
    act(() => payment().pay?.onClick());
    await waitFor(() => expect(payment().dialog).toBeDefined());
    const primary = payment().dialog?.primary;
    act(() => {
      if (primary && "onClick" in primary) primary.onClick();
    });
    await waitFor(() => expect(start).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(payment().dialog).toBeUndefined());
  });

  it("galat API (bukan jaringan) tampil sebagai pesan di halaman tanpa dialog", async () => {
    const start = vi
      .fn()
      .mockRejectedValue(new AppFailure({ kind: "api", code: "PAYMENT_EXPIRED", status: 409 }));
    const { payment, select } = mount(makeOrder(), { start });
    await waitFor(() => expect(payment).not.toThrow());
    act(() =>
      select()
        .methods.find((method) => method.id === "gopay")
        ?.onSelect(),
    );
    act(() => payment().pay?.onClick());
    await waitFor(() => expect(payment().error).toBeDefined());
    expect(payment().dialog).toBeUndefined();
  });

  it("order menunggu pembayaran menampilkan instruksi VA dan salin nomor", async () => {
    const writeText = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    const { payment } = mount(awaiting(makeOrder()));
    await waitFor(() => expect(payment).not.toThrow());
    const stage = payment().stage;
    expect(stage.kind).toBe("pending");
    if (stage.kind !== "pending") return;
    expect(stage.instruction.type).toBe("virtual_account");
    if (stage.instruction.type !== "virtual_account") return;
    const copy = stage.instruction.copy;
    act(() => copy.onClick?.());
    expect(writeText).toHaveBeenCalledWith("8801000000912");
  });

  it("mode mock: simulasi berhasil dan gagal memanggil use case", async () => {
    const { payment, simulate } = mount(awaiting(makeOrder()));
    await waitFor(() => expect(payment).not.toThrow());
    const stage = payment().stage;
    if (stage.kind !== "pending") throw new Error("bukan pending");
    act(() => stage.mock?.success.onClick());
    await waitFor(() => expect(simulate).toHaveBeenCalledWith("RB-T1", "PAID"));
    act(() => stage.mock?.fail.onClick());
    await waitFor(() => expect(simulate).toHaveBeenCalledWith("RB-T1", "FAILED"));
  });

  it("tanpa mode mock tidak ada kontrol simulasi", async () => {
    const { payment } = mount(awaiting(makeOrder()), { mocking: false });
    await waitFor(() => expect(payment).not.toThrow());
    const stage = payment().stage;
    if (stage.kind !== "pending") throw new Error("bukan pending");
    expect(stage.mock).toBeUndefined();
  });

  it("order PAID menampilkan hasil akhir tanpa tombol bayar", async () => {
    const { payment } = mount(makeOrder({ status: "PAID" }));
    await waitFor(() => expect(payment).not.toThrow());
    expect(payment().stage.kind).toBe("result");
    expect(payment().pay).toBeUndefined();
  });
});

describe("usePaymentController TTL expiry redirect", () => {
  beforeEach(() => {
    replace.mockClear();
  });

  it("tidak redirect jika countdown masih berjalan", async () => {
    // Order dengan TTL yang masih aktif (10 menit ke depan)
    const activeOrder = makeOrder({
      paymentTtl: {
        expiresAt: new Date(Date.now() + 600_000).toISOString(),
        ttlSeconds: 600,
        serverTime: new Date().toISOString(),
      },
    });
    const { payment } = mount(activeOrder);
    await waitFor(() => expect(payment).not.toThrow());
    expect(replace).not.toHaveBeenCalled();
  });

  it("tidak redirect jika order sudah PAID", async () => {
    const paidOrder = makeOrder({
      status: "PAID",
      paymentTtl: {
        expiresAt: new Date(Date.now() - 1000).toISOString(),
        ttlSeconds: 0,
        serverTime: new Date(Date.now() - 1000).toISOString(),
      },
    });
    const { payment } = mount(paidOrder);
    await waitFor(() => expect(payment).not.toThrow());
    expect(replace).not.toHaveBeenCalled();
  });

  it("tidak redirect jika order sudah EXPIRED (status dari server)", async () => {
    const expiredStatusOrder = makeOrder({
      status: "EXPIRED",
      paymentTtl: {
        expiresAt: new Date(Date.now() - 1000).toISOString(),
        ttlSeconds: 0,
        serverTime: new Date(Date.now() - 1000).toISOString(),
      },
    });
    const { payment } = mount(expiredStatusOrder);
    await waitFor(() => expect(payment).not.toThrow());
    expect(replace).not.toHaveBeenCalled();
  });
});

it("redirect ke Home saat countdown mencapai 0", async () => {
  // Order dengan TTL yang sudah expired (expiresAt di masa lalu)
  // Status tetap PENDING_PAYMENT supaya isOrderActive = true
  const expiredOrder = makeOrder({
    status: "PENDING_PAYMENT",
    paymentTtl: {
      expiresAt: new Date(Date.now() - 5000).toISOString(), // 5 detik lalu
      ttlSeconds: 0,
      serverTime: new Date(Date.now() - 5000).toISOString(),
    },
  });
  const { result } = mount(expiredOrder);
  // Tunggu sampai data ter-load dan effect redirect berjalan
  await waitFor(() => expect(result.current.kind).toBe("payment"), { timeout: 3000 });
  await waitFor(() => expect(replace).toHaveBeenCalledWith("/"), { timeout: 3000 });
});
