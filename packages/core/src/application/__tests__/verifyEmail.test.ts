import { describe, expect, it, vi } from "vitest";
import { verifyEmail } from "../verifyEmail";

describe("verifyEmail", () => {
  it("tanpa token: VERIFICATION_LINK_INVALID tanpa memanggil BE", async () => {
    const port = vi.fn();
    await expect(verifyEmail({ verifyEmail: port }, null)).rejects.toMatchObject({ error: { code: "VERIFICATION_LINK_INVALID" } });
    expect(port).not.toHaveBeenCalled();
  });

  it("token diteruskan ke BE", async () => {
    const port = vi.fn().mockResolvedValue(undefined);
    await verifyEmail({ verifyEmail: port }, "tok");
    expect(port).toHaveBeenCalledWith("tok");
  });
});
