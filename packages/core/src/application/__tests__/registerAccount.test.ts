import { describe, expect, it, vi } from "vitest";
import { AppFailure } from "../../errors/appError";
import { registerAccount } from "../registerAccount";

const sent = { email: "new@example.com", resendAvailableAt: "2026-10-23T10:00:30.000Z", serverNow: "2026-10-23T10:00:00.000Z" };
const NIK = "0012345678901234";

describe("registerAccount", () => {
  it("input tidak valid: semua masalah dikembalikan, BE tidak dipanggil", async () => {
    const port = vi.fn();
    expect(await registerAccount({ registerAccount: port }, { email: "", nik: "123" })).toEqual({
      status: "invalid",
      problems: { email: "required", nik: "invalid" },
    });
    expect(port).not.toHaveBeenCalled();
  });

  it("input valid: email tanpa spasi tepi, NIK sebagai string dengan nol di depan", async () => {
    const port = vi.fn().mockResolvedValue(sent);
    expect(await registerAccount({ registerAccount: port }, { email: " new@example.com ", nik: NIK })).toEqual({ status: "registered", sent });
    expect(port).toHaveBeenCalledWith("new@example.com", NIK);
  });

  it("kegagalan Dukcapil diteruskan", async () => {
    const failure = new AppFailure({ kind: "api", code: "NIK_MISMATCH", status: 422 });
    await expect(registerAccount({ registerAccount: vi.fn().mockRejectedValue(failure) }, { email: "a@b.co", nik: NIK })).rejects.toBe(failure);
  });
});
