import { describe, expect, it } from "vitest";
import { MAX_TICKETS_PER_BOOKING } from "../booking.constants";
import type { BookingTicketInput, TicketHolderInput } from "../booking-request.model";
import {
  aliasOptionsFor,
  duplicateHolderSlots,
  holderChoices,
  holderIdentity,
  holderInputFor,
  OWNER_HOLDER_ID,
  validateBookingTickets,
} from "../ticket-holders.rules";

const typed = (nik: string): BookingTicketInput => ({
  categoryId: "cat_vip",
  holder: { kind: "typed", nik },
});
const saved = (savedNikId: string): BookingTicketInput => ({
  categoryId: "cat_vip",
  holder: { kind: "saved", savedNikId },
});
const account: BookingTicketInput = { categoryId: "cat_vip", holder: { kind: "account" } };
const budi = { id: "snk_1", label: "Budi", nikMasked: "3171**********33" };
const sari = { id: "snk_2", label: "Sari", nikMasked: "3171**********44" };

describe("validateBookingTickets", () => {
  it("lolos untuk 1 sampai 3 tiket dengan pemegang unik", () => {
    expect(validateBookingTickets([typed("3171000000000033")])).toBeNull();
    expect(validateBookingTickets([typed("3171000000000011"), saved("snk_1"), account])).toBeNull();
  });

  it("tanpa tiket ditolak", () => {
    expect(validateBookingTickets([])).toBe("empty");
  });

  it(`lebih dari ${MAX_TICKETS_PER_BOOKING} tiket ditolak (BR-01)`, () => {
    const tickets = ["11", "22", "33", "44"].map((end) => typed(`31710000000000${end}`));
    expect(validateBookingTickets(tickets)).toBe("too_many");
  });

  it("NIK yang diketik harus 16 digit; pemegang dari profil tidak punya NIK untuk diperiksa", () => {
    expect(validateBookingTickets([typed("")])).toBe("nik_format");
    expect(validateBookingTickets([typed("31710000000000")])).toBe("nik_format");
    expect(validateBookingTickets([saved("snk_1"), account])).toBeNull();
  });

  it("NIK yang sama di dua tiket ditolak (BR-02)", () => {
    expect(validateBookingTickets([typed("3171000000000033"), typed("3171000000000033")])).toBe(
      "duplicate_nik",
    );
  });

  it("entri Daftar NIK yang sama atau NIK akun di dua tiket ditolak (BR-02)", () => {
    expect(validateBookingTickets([saved("snk_1"), saved("snk_1")])).toBe("duplicate_nik");
    expect(validateBookingTickets([account, account])).toBe("duplicate_nik");
  });

  it("NIK yang diketik tidak pernah dianggap sama dengan pilihan dari profil", () => {
    expect(validateBookingTickets([typed("3171000000000033"), saved("snk_1")])).toBeNull();
  });
});

describe("holderInputFor", () => {
  it("pilihan dari profil menang atas NIK yang diketik", () => {
    expect(holderInputFor(undefined, "3171000000000033")).toEqual({ kind: "typed", nik: "3171000000000033" });
    expect(holderInputFor(OWNER_HOLDER_ID, "3171000000000033")).toEqual({ kind: "account" });
    expect(holderInputFor("snk_1", "")).toEqual({ kind: "saved", savedNikId: "snk_1" });
  });
});

describe("holderIdentity / duplicateHolderSlots", () => {
  it("NIK diketik dibandingkan nilainya, pilihan profil lewat id", () => {
    const holders: Record<string, TicketHolderInput> = {
      a: { kind: "typed", nik: "3171000000000033" },
      b: { kind: "typed", nik: "3171000000000033" },
      c: { kind: "saved", savedNikId: "snk_1" },
      d: { kind: "saved", savedNikId: "snk_1" },
      e: { kind: "account" },
      f: { kind: "typed", nik: "" },
      g: { kind: "typed", nik: "" },
    };
    expect(duplicateHolderSlots(holders)).toEqual(new Set(["a", "b", "c", "d"]));
    expect(holderIdentity(holders.e!)).not.toBe(holderIdentity(holders.c!));
  });
});

describe("aliasOptionsFor", () => {
  it("pilihan yang dipakai tiket lain ditandai, tiket sendiri tidak", () => {
    const picks = { a: budi.id };
    expect(aliasOptionsFor("b", [budi, sari], picks)).toEqual([
      { alias: budi, takenByOtherTicket: true },
      { alias: sari, takenByOtherTicket: false },
    ]);
    expect(aliasOptionsFor("a", [budi, sari], picks)).toEqual([
      { alias: budi, takenByOtherTicket: false },
      { alias: sari, takenByOtherTicket: false },
    ]);
  });
});

describe("holderChoices", () => {
  const ownerMasked = "3171**********11";

  it("tamu tidak punya pilihan pemilik; alias apa adanya", () => {
    expect(holderChoices(null, [budi])).toEqual([budi]);
    expect(holderChoices(undefined, [budi])).toEqual([budi]);
  });

  it("pemilik dengan NIK tersamar jadi pilihan pertama, sebelum entri Daftar NIK", () => {
    const choices = holderChoices(ownerMasked, [budi, sari]);
    expect(choices.map((choice) => choice.id)).toEqual([OWNER_HOLDER_ID, "snk_1", "snk_2"]);
    expect(choices[0]).toMatchObject({ nikMasked: ownerMasked });
  });

  it("akun tanpa NIK terverifikasi tidak menawarkan pemilik", () => {
    expect(holderChoices("", [budi])).toEqual([budi]);
  });
});
