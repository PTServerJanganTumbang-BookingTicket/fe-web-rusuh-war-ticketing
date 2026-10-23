import { describe, expect, it, vi } from "vitest";
import { AppFailure } from "../../errors/appError";
import type { QueueState } from "../../domain/queue";
import { enterBookingRoom } from "../enterBookingRoom";

const admitted: QueueState = { status: "admitted", eventName: "Konser Rusuh", accessToken: "tok-1", expiresAt: "2026-10-22T10:10:00.000Z" };
const waiting: QueueState = { status: "waiting", eventName: "Konser Rusuh", position: 10, joinedPosition: 20, etaSeconds: 60, retryAfterMs: 3000 };

describe("enterBookingRoom", () => {
  it("menitipkan access token ke port saat admitted", async () => {
    const startSession = vi.fn().mockResolvedValue(undefined);
    await expect(enterBookingRoom({ startSession }, admitted)).resolves.toBe(true);
    expect(startSession).toHaveBeenCalledExactlyOnceWith("tok-1");
  });

  it("tidak menyentuh port selama masih menunggu", async () => {
    const startSession = vi.fn();
    await expect(enterBookingRoom({ startSession }, waiting)).resolves.toBe(false);
    expect(startSession).not.toHaveBeenCalled();
  });

  it("melempar kegagalan port apa adanya", async () => {
    const failure = new AppFailure({ kind: "network" });
    const startSession = vi.fn().mockRejectedValue(failure);
    await expect(enterBookingRoom({ startSession }, admitted)).rejects.toBe(failure);
  });
});
