import { describe, expect, it } from "vitest";
import { toWaitingViewProps } from "./queue.mapper";

const waiting = {
  status: "waiting",
  eventName: "Konser A — Jakarta",
  position: 1248,
  joinedPosition: 1248,
  etaSeconds: 240,
  retryAfterMs: 2000,
} as const;

describe("toWaitingViewProps", () => {
  it("memformat posisi, estimasi, dan nama event seperti wireframe 9.2", () => {
    const view = toWaitingViewProps(waiting);
    expect(view.eventName).toBe("Konser A — Jakarta");
    expect(view.position).toMatchObject({
      label: "Posisi antrian Anda saat ini",
      value: "#1.248",
      suffix: "dari depan antrian",
    });
    expect(view.eta?.value).toBe("± 4 menit");
    expect(view.note).toContain("otomatis masuk");
  });

  it("progress naik saat posisi maju", () => {
    expect(toWaitingViewProps(waiting).progress?.percent).toBe(0);
    expect(toWaitingViewProps({ ...waiting, position: 416 }).progress?.percent).toBe(66);
  });

  it("estimasi minimal 1 menit", () => {
    expect(toWaitingViewProps({ ...waiting, position: 10, etaSeconds: 2 }).eta?.value).toBe("± 1 menit");
  });
});
