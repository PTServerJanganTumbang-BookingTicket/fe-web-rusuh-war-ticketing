import { describe, expect, it } from "vitest";
import { stockByCategory } from "../stock";

describe("stockByCategory", () => {
  it("memetakan id kategori ke sisa stok", () => {
    expect(
      stockByCategory([
        { id: "vip", name: "VIP", priceIdr: 1, stock: 12 },
        { id: "tribune", name: "Tribune", priceIdr: 1, stock: 0 },
      ]),
    ).toEqual({ vip: 12, tribune: 0 });
  });

  it("kosong untuk daftar kosong", () => {
    expect(stockByCategory([])).toEqual({});
  });
});
