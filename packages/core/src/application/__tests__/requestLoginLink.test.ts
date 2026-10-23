import { describe, expect, it, vi } from "vitest";
import { AppFailure } from "../../errors/appError";
import { requestLoginLink } from "../requestLoginLink";

const sent = { email: "you@example.com", resendAvailableAt: "2026-10-23T10:01:00.000Z", serverNow: "2026-10-23T10:00:00.000Z" };

describe("requestLoginLink", () => {
  it("email tidak valid: tidak memanggil BE", async () => {
    const sendLoginLink = vi.fn();
    expect(await requestLoginLink({ sendLoginLink }, "you@", null)).toEqual({ status: "invalid", problem: "invalid" });
    expect(await requestLoginLink({ sendLoginLink }, "", null)).toEqual({ status: "invalid", problem: "required" });
    expect(sendLoginLink).not.toHaveBeenCalled();
  });

  it("email valid dikirim tanpa spasi tepi, returnTo disaring", async () => {
    const sendLoginLink = vi.fn().mockResolvedValue(sent);
    expect(await requestLoginLink({ sendLoginLink }, " you@example.com ", "https://evil.test")).toEqual({ status: "sent", sent });
    expect(sendLoginLink).toHaveBeenCalledWith("you@example.com", "/");
  });

  it("kegagalan port diteruskan", async () => {
    const failure = new AppFailure({ kind: "api", code: "RATE_LIMITED", status: 429, retryAfterMs: 30_000 });
    await expect(requestLoginLink({ sendLoginLink: vi.fn().mockRejectedValue(failure) }, "you@example.com", "/x")).rejects.toBe(failure);
  });
});
