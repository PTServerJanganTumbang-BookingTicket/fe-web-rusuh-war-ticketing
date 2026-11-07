import { describe, expect, it } from "vitest";
import { AppFailure } from "@/core/domain/app-error";
import type { SubmitBookingInput } from "../../domain/booking-request.model";
import type { BookingProtocol } from "../../domain/booking.protocol";
import { createSubmitBookingUseCase } from "../submit-booking.use-case";
import { createListHolderAliasesUseCase } from "../list-holder-aliases.use-case";

function fakeBookingService() {
  const submitted: SubmitBookingInput[] = [];
  const bookingService: BookingProtocol = {
    getSession: async () => {
      throw new Error("tidak dipakai");
    },
    getEvent: async () => {
      throw new Error("tidak dipakai");
    },
    validateNik: async () => ({ status: "not_found" }),
    submitBooking: async (input) => {
      submitted.push(input);
      return { bookingId: "RB-1" };
    },
  };
  return { bookingService, submitted };
}

const input = (niks: string[]): SubmitBookingInput => ({
  eventId: "evt_1",
  contactEmail: "  rina@example.com ",
  termsVersion: "2026-10-01",
  tickets: niks.map((nik) => ({ categoryId: "cat_vip", nik })),
});

describe("createSubmitBookingUseCase", () => {
  it("meneruskan tiket dan email yang sudah dirapikan", async () => {
    const { bookingService, submitted } = fakeBookingService();
    expect(await createSubmitBookingUseCase({ bookingService })(input(["3171000000000033"]))).toEqual({
      bookingId: "RB-1",
    });
    expect(submitted).toEqual([{ ...input(["3171000000000033"]), contactEmail: "rina@example.com" }]);
  });

  it.each([
    ["NIK dobel", ["3171000000000033", "3171000000000033"]],
    ["lebih dari 3 tiket", ["3171000000000011", "3171000000000022", "3171000000000033", "3171000000000044"]],
    ["NIK tidak lengkap", ["317100"]],
  ])("%s ditolak BOOKING_INVALID tanpa request", async (_, niks) => {
    const { bookingService, submitted } = fakeBookingService();
    const thrown = await createSubmitBookingUseCase({ bookingService })(input(niks)).catch((e: unknown) => e);
    expect(thrown).toBeInstanceOf(AppFailure);
    expect((thrown as AppFailure).error).toEqual({ kind: "api", code: "BOOKING_INVALID", status: 400 });
    expect(submitted).toEqual([]);
  });
});

describe("createListHolderAliasesUseCase", () => {
  it("mengembalikan alias dari HolderAliasProtocol", async () => {
    const aliases = [{ id: "snk_1", label: "Budi", nik: "3171000000000033", nikMasked: "3171****33" }];
    const listHolderAliasesUseCase = createListHolderAliasesUseCase({
      holderAliasService: { list: async () => aliases },
    });
    expect(await listHolderAliasesUseCase()).toBe(aliases);
  });
});
