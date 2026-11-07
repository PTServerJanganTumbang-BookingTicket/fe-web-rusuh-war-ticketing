import { describe, expect, it } from "vitest";
import { MAX_TICKETS_PER_BOOKING } from "../booking.constants";
import { aliasOptionsFor, validateBookingTickets } from "../ticket-holders.rules";

const ticket = (nik: string) => ({ categoryId: "cat_vip", nik });
const budi = { id: "snk_1", label: "Budi", nik: "3171000000000033", nikMasked: "3171****33" };
const sari = { id: "snk_2", label: "Sari", nik: "3171000000000044", nikMasked: "3171****44" };

describe("validateBookingTickets", () => {
  it("lolos untuk 1 sampai 3 tiket dengan NIK unik", () => {
    expect(validateBookingTickets([ticket("3171000000000033")])).toBeNull();
    expect(
      validateBookingTickets([
        ticket("3171000000000011"),
        ticket("3171000000000022"),
        ticket("3171000000000033"),
      ]),
    ).toBeNull();
  });

  it("tanpa tiket ditolak", () => {
    expect(validateBookingTickets([])).toBe("empty");
  });

  it(`lebih dari ${MAX_TICKETS_PER_BOOKING} tiket ditolak (BR-01)`, () => {
    const tickets = ["11", "22", "33", "44"].map((end) => ticket(`31710000000000${end}`));
    expect(validateBookingTickets(tickets)).toBe("too_many");
  });

  it("setiap tiket butuh tepat satu NIK 16 digit", () => {
    expect(validateBookingTickets([ticket("")])).toBe("nik_format");
    expect(validateBookingTickets([ticket("31710000000000")])).toBe("nik_format");
  });

  it("NIK yang sama di dua tiket ditolak (BR-02)", () => {
    expect(validateBookingTickets([ticket("3171000000000033"), ticket("3171000000000033")])).toBe(
      "duplicate_nik",
    );
  });
});

describe("aliasOptionsFor", () => {
  it("alias yang NIK-nya dipakai tiket lain ditandai, tiket sendiri tidak", () => {
    const niks = { a: budi.nik, b: "" };
    expect(aliasOptionsFor("b", [budi, sari], niks)).toEqual([
      { alias: budi, takenByOtherTicket: true },
      { alias: sari, takenByOtherTicket: false },
    ]);
    expect(aliasOptionsFor("a", [budi, sari], niks)).toEqual([
      { alias: budi, takenByOtherTicket: false },
      { alias: sari, takenByOtherTicket: false },
    ]);
  });

  it("NIK manual yang sama dengan alias juga menandai alias itu", () => {
    expect(aliasOptionsFor("b", [sari], { a: sari.nik })[0]?.takenByOtherTicket).toBe(true);
  });
});
