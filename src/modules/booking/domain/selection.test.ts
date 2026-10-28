import { describe, expect, it } from "vitest";
import { selectedCount, selectionReducer, totalPriceIdr, type Selection } from "./selection";

const stock = { vip: 12, festival: 240, tribune: 0 };
const add = (selection: Selection, categoryId: string, activeBooked = 0) =>
  selectionReducer(selection, { type: "ADD_TICKET", categoryId, stock, activeBooked });

describe("selectionReducer", () => {
  it("menambah dan mengurangi tiket", () => {
    const one = add({}, "vip");
    expect(one).toEqual({ vip: 1 });
    expect(selectionReducer(one, { type: "REMOVE_TICKET", categoryId: "vip" })).toEqual({ vip: 0 });
  });

  it("tidak bisa menambah kategori yang habis", () => {
    const before = {};
    expect(add(before, "tribune")).toBe(before);
  });

  it("berhenti di 3 tiket lintas kategori", () => {
    const three = add(add(add({}, "vip"), "festival"), "vip");
    expect(selectedCount(three)).toBe(3);
    expect(add(three, "festival")).toBe(three);
  });

  it("memperhitungkan booking aktif dari server", () => {
    expect(selectedCount(add({}, "vip", 2))).toBe(1);
    const before = {};
    expect(add(before, "vip", 3)).toBe(before);
  });

  it("tidak bisa mengurangi di bawah 0", () => {
    const before = {};
    expect(selectionReducer(before, { type: "REMOVE_TICKET", categoryId: "vip" })).toBe(before);
  });
});

describe("totalPriceIdr", () => {
  it("menjumlahkan harga kali jumlah", () => {
    const categories = [
      { id: "vip", name: "VIP", priceIdr: 1_500_000, stock: 12 },
      { id: "festival", name: "Festival", priceIdr: 850_000, stock: 240 },
    ];
    expect(totalPriceIdr({ vip: 1, festival: 2 }, categories)).toBe(3_200_000);
    expect(totalPriceIdr({}, categories)).toBe(0);
  });
});
