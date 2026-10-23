// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { createWrapper, setupMockServer } from "../../__tests__/support";
import { usePaymentViewModel } from "../usePaymentViewModel";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, replace: vi.fn() }) }));

setupMockServer();

function mount(orderId: string) {
  const hook = renderHook(() => usePaymentViewModel(orderId), { wrapper: createWrapper() });
  const paying = () => {
    const state = hook.result.current.state;
    if (state.kind !== "paying") throw new Error(`layar: ${state.kind}`);
    return state;
  };
  return { ...hook, paying };
}

describe("usePaymentViewModel", () => {
  it("memuat order lalu masuk tahap bayar dengan metode default virtual account", async () => {
    const { result, paying } = mount("RB-V1");
    expect(result.current.state.kind).toBe("loading");
    await waitFor(() => expect(result.current.state.kind).toBe("paying"));
    expect(paying().order).toMatchObject({ status: "awaiting_method", totalIdr: 1_500_000 });
    expect(paying()).toMatchObject({ method: "virtual_account", submitting: false, copied: false });
  });

  it("e-wallet: bayar menghasilkan QR; simulasi berhasil membuka status akhir paid", async () => {
    const { result, paying } = mount("RB-V2");
    await waitFor(() => expect(result.current.state.kind).toBe("paying"));

    act(() => result.current.actions.selectMethod("e_wallet"));
    await waitFor(() => expect(paying().method).toBe("e_wallet"));
    act(() => result.current.actions.pay());

    await waitFor(() => expect(paying().order.instruction?.type).toBe("qr"));
    expect(paying().simulation).toEqual({ busy: false });

    act(() => result.current.actions.simulate("success"));
    await waitFor(() => expect(result.current.state.kind).toBe("settled"));
    const state = result.current.state;
    expect(state.kind === "settled" && state.order.status).toBe("paid");
  });

  it("virtual account: simulasi gagal membuka status failed, dan goHome kembali ke Home", async () => {
    push.mockClear();
    const { result, paying } = mount("RB-V3");
    await waitFor(() => expect(result.current.state.kind).toBe("paying"));
    act(() => result.current.actions.pay());

    await waitFor(() => expect(paying().order.instruction).toMatchObject({ type: "virtual_account", number: "8277081234567890" }));
    act(() => result.current.actions.simulate("fail"));
    await waitFor(() => expect(result.current.state.kind).toBe("settled"));

    const state = result.current.state;
    expect(state.kind === "settled" && state.order.status).toBe("failed");
    act(() => result.current.actions.goHome());
    expect(push).toHaveBeenCalledWith("/");
  });
});
