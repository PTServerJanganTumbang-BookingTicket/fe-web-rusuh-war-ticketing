import { describe, expect, it, vi } from "vitest";
import type { AuthCallbackScreenState } from "../authCallbackModel";
import { toAuthCallbackViewProps } from "../toAuthCallbackViewProps";

const actions = { requestNewLink: vi.fn() };
const view = (state: AuthCallbackScreenState) => toAuthCallbackViewProps({ state, actions });

describe("toAuthCallbackViewProps", () => {
  it("redeeming: status netral tanpa tombol", () => {
    expect(view({ kind: "redeeming" })).toEqual({ title: "Masuk", message: "Memverifikasi link login…", tone: "neutral" });
  });

  it.each([
    [{ kind: "api", code: "LOGIN_LINK_INVALID", status: 410 } as const, "sudah dipakai"],
    [{ kind: "network" } as const, "Koneksi bermasalah"],
    [{ kind: "unknown" } as const, "belum bisa diverifikasi"],
  ])("failed %o: pesan i18n dan tombol minta link baru", (error, message) => {
    const props = view({ kind: "failed", error });
    expect(props).toMatchObject({ tone: "error", title: "Link login tidak berlaku", message: expect.stringContaining(message) });
    props.action?.onClick();
    expect(actions.requestNewLink).toHaveBeenCalled();
  });
});
