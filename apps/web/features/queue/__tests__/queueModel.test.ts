import { describe, expect, it } from "vitest";
import { deriveQueueScreenState } from "../queueModel";

const waiting = { status: "waiting", eventName: "Konser A", position: 10, joinedPosition: 100, etaSeconds: 30, retryAfterMs: 2000 } as const;
const admitted = { status: "admitted", eventName: "Konser A", accessToken: "tok", expiresAt: "2026-10-19T10:10:00.000Z" } as const;
const network = { kind: "network" } as const;

describe("deriveQueueScreenState", () => {
  it("tanpa data dan tanpa error: loading", () => {
    expect(deriveQueueScreenState({ queue: undefined, error: undefined, enterError: undefined })).toEqual({ kind: "loading" });
  });

  it("error tanpa data: failed", () => {
    expect(deriveQueueScreenState({ queue: undefined, error: network, enterError: undefined })).toEqual({ kind: "failed", error: network });
  });

  it("data waiting tetap tampil walau polling terakhir gagal", () => {
    expect(deriveQueueScreenState({ queue: waiting, error: network, enterError: undefined })).toEqual({ kind: "waiting", queue: waiting });
  });

  it("admitted: entering, atau enterFailed bila menitipkan sesi gagal", () => {
    expect(deriveQueueScreenState({ queue: admitted, error: undefined, enterError: undefined })).toEqual({ kind: "entering", eventName: "Konser A" });
    expect(deriveQueueScreenState({ queue: admitted, error: undefined, enterError: network })).toEqual({
      kind: "enterFailed",
      eventName: "Konser A",
      error: network,
    });
  });
});
