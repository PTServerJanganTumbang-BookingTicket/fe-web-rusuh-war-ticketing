import { describe, expect, it, vi } from "vitest";
import { AppFailure } from "../../errors/appError";
import { logout } from "../logout";

describe("logout", () => {
  it("mengakhiri sesi di BE", async () => {
    const endSession = vi.fn().mockResolvedValue(undefined);
    await logout({ endSession });
    expect(endSession).toHaveBeenCalledTimes(1);
  });

  it("kegagalan port diteruskan", async () => {
    const failure = new AppFailure({ kind: "network" });
    await expect(logout({ endSession: vi.fn().mockRejectedValue(failure) })).rejects.toBe(failure);
  });
});
