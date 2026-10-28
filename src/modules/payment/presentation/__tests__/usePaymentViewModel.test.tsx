// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { asValue } from "awilix";
import { setupFakeEventSources } from "@/test/fakeEventSource";
import { createWrapper, setupMockServer, setupTestContainer } from "@/test/support";
import { usePaymentViewModel } from "../usePaymentViewModel";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, replace: vi.fn() }) }));

setupMockServer();

function mount(orderId: string, container = setupTestContainer()) {
  const hook = renderHook(() => usePaymentViewModel(orderId), { wrapper: createWrapper(container) });
  const payment = () => {
    const screen = hook.result.current;
    if (screen.kind !== "payment") throw new Error(`layar: ${screen.kind}`);
    return screen.view;
  };
  return { ...hook, payment };
}

describe("usePaymentViewModel", () => {
  it("memuat order lalu menampilkan pilihan metode dan total", async () => {
    const { result, payment } = mount("RB-V1");
    expect(result.current.kind).toBe("status");
    await waitFor(() => expect(result.current.kind).toBe("payment"));
    expect(payment().methods?.options).toHaveLength(3);
    expect(payment().total.value).toContain("1.500.000");
    expect(payment().mockControls).toBeUndefined();
  });

  it("e-wallet: bayar menampilkan QR dan kontrol simulasi; simulasi berhasil membuka status berhasil", async () => {
    const { result, payment } = mount("RB-V2");
    await waitFor(() => expect(result.current.kind).toBe("payment"));

    act(() =>
      payment()
        .methods?.options.find((o) => o.id === "e_wallet")
        ?.onSelect(),
    );
    await waitFor(() =>
      expect(payment().methods?.options.find((o) => o.id === "e_wallet")?.selected).toBe(true),
    );
    act(() => payment().pay?.onClick());

    await waitFor(() => expect(payment().pending?.instruction.type).toBe("qr"));
    expect(payment().methods).toBeUndefined();
    expect(payment().mockControls).toBeDefined();

    act(() => payment().mockControls?.success.onClick());
    await waitFor(() => expect(result.current.kind).toBe("result"));
    expect(result.current.kind === "result" && result.current.view).toMatchObject({
      tone: "success",
      ticket: "e-Tiket ×1 — VIP",
    });
  });

  it("virtual account: nomor tampil, simulasi gagal membuka status gagal dan CTA kembali ke Home", async () => {
    push.mockClear();
    const { result, payment } = mount("RB-V3");
    await waitFor(() => expect(result.current.kind).toBe("payment"));
    act(() => payment().pay?.onClick());

    await waitFor(() =>
      expect(payment().pending?.instruction).toMatchObject({
        type: "virtual_account",
        number: "8277081234567890",
      }),
    );
    act(() => payment().mockControls?.fail.onClick());
    await waitFor(() => expect(result.current.kind).toBe("result"));

    const view = result.current.kind === "result" ? result.current.view : undefined;
    expect(view).toMatchObject({ tone: "danger", title: "Pembayaran Gagal" });
    act(() => view?.cta.onClick());
    expect(push).toHaveBeenCalledWith("/");
  });

  it("SSE: status paid dari stream membuka layar berhasil tanpa menunggu polling, lalu stream ditutup", async () => {
    const fakes = setupFakeEventSources();
    const { result } = mount("RB-V4", setupTestContainer({ eventSourceFactory: asValue(fakes.factory) }));
    await waitFor(() => expect(result.current.kind).toBe("payment"));
    const stream = fakes.find("/orders/RB-V4/stream")!;

    act(() => {
      stream.emit("open");
      stream.emit("order", {
        orderId: "RB-V4",
        eventName: "Konser A — Jakarta",
        items: [{ name: "VIP", quantity: 1 }],
        totalIdr: 1_500_000,
        expiresAt: "2026-10-19T10:10:00.000Z",
        serverNow: "2026-10-19T10:00:00.000Z",
        status: "paid",
      });
    });
    expect(result.current.kind).toBe("result");
    expect(stream.closed).toBe(true);
  });
});
