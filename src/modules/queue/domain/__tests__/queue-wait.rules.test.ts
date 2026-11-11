import { describe, expect, it } from "vitest";
import { queueWaitEstimate } from "../queue-wait.rules";

describe("queueWaitEstimate (kontrak §3.5)", () => {
  it("posisi 0 atau kurang: giliran sebentar lagi, berapa pun lajunya", () => {
    expect(queueWaitEstimate(0, 200)).toEqual({ kind: "soon" });
    expect(queueWaitEstimate(-3, 0)).toEqual({ kind: "soon" });
  });

  it("laju 0 atau negatif: masih menghitung, bukan angka", () => {
    expect(queueWaitEstimate(1248, 0)).toEqual({ kind: "calculating" });
    expect(queueWaitEstimate(1248, -1)).toEqual({ kind: "calculating" });
  });

  it("contoh kontrak pada laju 200 per menit", () => {
    expect(queueWaitEstimate(150, 200)).toEqual({ kind: "minutes", minutes: 1 });
    expect(queueWaitEstimate(1_000, 200)).toEqual({ kind: "minutes", minutes: 5 });
    expect(queueWaitEstimate(2_400, 200)).toEqual({ kind: "minutes", minutes: 15 });
    expect(queueWaitEstimate(6_000, 200)).toEqual({ kind: "minutes", minutes: 30 });
    expect(queueWaitEstimate(145_000, 200)).toEqual({ kind: "long", hours: 3 });
  });

  it("sampai 10 menit tidak dibulatkan; 11–30 ke kelipatan 5; 31–60 ke kelipatan 10", () => {
    expect(queueWaitEstimate(10, 1)).toEqual({ kind: "minutes", minutes: 10 });
    expect(queueWaitEstimate(11, 1)).toEqual({ kind: "minutes", minutes: 15 });
    expect(queueWaitEstimate(30, 1)).toEqual({ kind: "minutes", minutes: 30 });
    expect(queueWaitEstimate(31, 1)).toEqual({ kind: "minutes", minutes: 40 });
    expect(queueWaitEstimate(50, 1)).toEqual({ kind: "minutes", minutes: 50 });
  });

  it("60 sampai 180 menit ditampilkan dalam jam, kelipatan setengah jam", () => {
    expect(queueWaitEstimate(51, 1)).toEqual({ kind: "hours", hours: 1 });
    expect(queueWaitEstimate(61, 1)).toEqual({ kind: "hours", hours: 1.5 });
    expect(queueWaitEstimate(180, 1)).toEqual({ kind: "hours", hours: 3 });
  });

  it("di atas 180 menit: lebih dari 3 jam", () => {
    expect(queueWaitEstimate(181, 1)).toEqual({ kind: "long", hours: 3 });
  });
});
