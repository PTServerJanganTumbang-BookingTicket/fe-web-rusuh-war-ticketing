// @vitest-environment jsdom
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Observer } from "@/core/domain/live-updates.protocol";
import { useLiveUpdates } from "../live-updates.hook";

function setup() {
  const client = new QueryClient();
  const observers: Observer<number>[] = [];
  const unsubscribe = vi.fn();
  const watch = vi.fn((observer: Observer<number>) => {
    observers.push(observer);
    return unsubscribe;
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, observers, unsubscribe, watch, wrapper };
}

describe("useLiveUpdates", () => {
  it("berlangganan saat dipasang dan true setelah tersambung", () => {
    const { watch, observers, wrapper } = setup();
    const { result } = renderHook(() => useLiveUpdates<number>({ queryKey: ["a"], watch }), { wrapper });
    expect(watch).toHaveBeenCalledOnce();
    expect(result.current).toBe(false);
    act(() => observers[0]!.connected());
    expect(result.current).toBe(true);
    act(() => observers[0]!.disconnected());
    expect(result.current).toBe(false);
  });

  it("enabled false: tidak berlangganan dan hasilnya false; berlangganan setelah enabled menjadi true", () => {
    const { watch, observers, wrapper } = setup();
    const { result, rerender } = renderHook(
      ({ enabled }) => useLiveUpdates<number>({ queryKey: ["b"], watch, enabled }),
      { wrapper, initialProps: { enabled: false } },
    );
    expect(watch).not.toHaveBeenCalled();
    expect(result.current).toBe(false);

    rerender({ enabled: true });
    expect(watch).toHaveBeenCalledOnce();
    act(() => observers[0]!.connected());
    expect(result.current).toBe(true);
  });

  it("enabled kembali false: berhenti berlangganan dan hasilnya false", () => {
    const { watch, observers, unsubscribe, wrapper } = setup();
    const { result, rerender } = renderHook(
      ({ enabled }) => useLiveUpdates<number>({ queryKey: ["c"], watch, enabled }),
      { wrapper, initialProps: { enabled: true } },
    );
    act(() => observers[0]!.connected());
    expect(result.current).toBe(true);

    rerender({ enabled: false });
    expect(unsubscribe).toHaveBeenCalledOnce();
    expect(result.current).toBe(false);
  });

  it("unmount berhenti berlangganan", () => {
    const { watch, unsubscribe, wrapper } = setup();
    const { unmount } = renderHook(() => useLiveUpdates<number>({ queryKey: ["e"], watch }), { wrapper });
    unmount();
    expect(unsubscribe).toHaveBeenCalledOnce();
  });

  it("nilai dari stream ditulis ke cache dan `until` menutup stream", () => {
    const { client, watch, observers, unsubscribe, wrapper } = setup();
    renderHook(() => useLiveUpdates<number>({ queryKey: ["d"], watch, until: (value) => value >= 2 }), {
      wrapper,
    });
    act(() => observers[0]!.next(1));
    expect(client.getQueryData(["d"])).toBe(1);
    expect(unsubscribe).not.toHaveBeenCalled();

    act(() => observers[0]!.next(2));
    expect(client.getQueryData(["d"])).toBe(2);
    expect(unsubscribe).toHaveBeenCalledOnce();
  });
});
