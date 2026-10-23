import { describe, expect, it, vi } from "vitest";
import { AppFailure } from "../../errors/appError";
import { redeemLoginLink } from "../redeemLoginLink";

describe("redeemLoginLink", () => {
  it("tanpa token: LOGIN_LINK_INVALID tanpa memanggil BE", async () => {
    const port = vi.fn();
    await expect(redeemLoginLink({ redeemLoginLink: port }, null, "/x")).rejects.toMatchObject({
      error: { kind: "api", code: "LOGIN_LINK_INVALID" },
    });
    expect(port).not.toHaveBeenCalled();
  });

  it("token ditukar lalu kembali ke tujuan yang aman", async () => {
    const port = vi.fn().mockResolvedValue(undefined);
    expect(await redeemLoginLink({ redeemLoginLink: port }, "tok", "/events/evt-1/queue")).toBe("/events/evt-1/queue");
    expect(port).toHaveBeenCalledWith("tok");
    expect(await redeemLoginLink({ redeemLoginLink: port }, "tok", "https://evil.test")).toBe("/");
  });

  it("token ditolak BE: kegagalan diteruskan", async () => {
    const failure = new AppFailure({ kind: "api", code: "LOGIN_LINK_INVALID", status: 410 });
    await expect(redeemLoginLink({ redeemLoginLink: vi.fn().mockRejectedValue(failure) }, "tok", null)).rejects.toBe(failure);
  });
});
