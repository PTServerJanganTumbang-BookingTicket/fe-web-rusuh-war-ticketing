import { describe, expect, it } from "vitest";
import { selectedCount, selectionReducer, totalPriceIdr, type Selection } from "../selection.reducer";

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
      { id: "vip", name: "VIP", description: "", priceIdr: 1_500_000, stock: 12 },
      { id: "festival", name: "Festival", description: "", priceIdr: 850_000, stock: 240 },
    ];
    expect(totalPriceIdr({ vip: 1, festival: 2 }, categories)).toBe(3_200_000);
    expect(totalPriceIdr({}, categories)).toBe(0);
  });
});

describe("CLAMP_TO_STOCK", () => {
  it("memangkas jumlah ke stok terbaru dan membuang kategori yang habis", () => {
    const next = selectionReducer(
      { cat_vip: 2, cat_festival: 1, cat_tribune: 1 },
      { type: "CLAMP_TO_STOCK", stock: { cat_vip: 1, cat_festival: 0, cat_tribune: 5 } },
    );
    expect(next).toEqual({ cat_vip: 1, cat_tribune: 1 });
  });

  it("RESET membuang semua pilihan saat akses habis", () => {
    expect(selectionReducer({ vip: 2, festival: 1 }, { type: "RESET" })).toEqual({});
  });

  it("RESTORE memulihkan pilihan tersimpan, dibatasi stok dan kategori yang ada", () => {
    const restored = selectionReducer(
      {},
      { type: "RESTORE", selection: { vip: 20, gone: 2, tribune: 1 }, stock },
    );
    expect(restored).toEqual({ vip: 12 });
  });
});
