import { describe, expect, it, vi } from "vitest";
import type { QueueScreenState } from "../queueModel";
import { toQueueViewProps } from "../toQueueViewProps";

const waiting = {
  status: "waiting",
  eventName: "Konser A — Jakarta",
  position: 1248,
  joinedPosition: 1248,
  etaSeconds: 240,
  retryAfterMs: 2000,
} as const;

const retryEnter = vi.fn();
const view = (state: QueueScreenState) => toQueueViewProps({ state, actions: { retryEnter } });

describe("toQueueViewProps", () => {
  it("memformat posisi, estimasi, dan nama event seperti wireframe 9.2", () => {
    const props = view({ kind: "waiting", queue: waiting });
    expect(props.eventName).toBe("Konser A — Jakarta");
    expect(props.position).toMatchObject({ label: "Posisi antrian Anda saat ini", value: "#1.248", suffix: "dari depan antrian" });
    expect(props.eta?.value).toBe("± 4 menit");
    expect(props.note).toContain("otomatis masuk");
  });

  it("progress naik saat posisi maju", () => {
    expect(view({ kind: "waiting", queue: waiting }).progress?.percent).toBe(0);
    expect(view({ kind: "waiting", queue: { ...waiting, position: 416 } }).progress?.percent).toBe(66);
  });

  it("estimasi minimal 1 menit", () => {
    expect(view({ kind: "waiting", queue: { ...waiting, position: 10, etaSeconds: 2 } }).eta?.value).toBe("± 1 menit");
  });

  it("gagal jaringan memakai pesan i18n, bukan pesan mentah", () => {
    expect(view({ kind: "failed", error: { kind: "network" } })).toMatchObject({
      state: "error",
      message: "Koneksi bermasalah. Kami mencoba lagi otomatis.",
    });
  });

  it("gagal menitipkan sesi: tombol coba lagi memanggil retryEnter", () => {
    const props = view({ kind: "enterFailed", eventName: "Konser A", error: { kind: "unknown", status: 500 } });
    expect(props.state).toBe("admitted");
    props.action?.onClick();
    expect(retryEnter).toHaveBeenCalledTimes(1);
  });

  it("sedang masuk: tanpa tombol", () => {
    expect(view({ kind: "entering", eventName: "Konser A" }).action).toBeUndefined();
  });
});
