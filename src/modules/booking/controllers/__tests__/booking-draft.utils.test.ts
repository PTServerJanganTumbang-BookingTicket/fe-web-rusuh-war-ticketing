// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { clearBookingDraft, loadBookingDraft, saveBookingDraft } from "../booking-draft.utils";

const draft = {
  expiresAt: "2026-01-01T10:00:00Z",
  selection: { vip: 2 },
  niks: { "vip-0": "3174000000000001" },
  aliasPicks: {},
  contactEmail: "a@b.co",
};

describe("booking draft", () => {
  beforeEach(() => sessionStorage.clear());

  it("dipulihkan per event untuk grant yang sama", () => {
    saveBookingDraft("e1", draft);
    expect(loadBookingDraft("e1", draft.expiresAt)).toEqual(draft);
    expect(loadBookingDraft("e2", draft.expiresAt)).toBeNull();
  });

  it("dibuang bila grant berganti", () => {
    saveBookingDraft("e1", draft);
    expect(loadBookingDraft("e1", "2026-01-01T11:00:00Z")).toBeNull();
    expect(loadBookingDraft("e1", draft.expiresAt)).toBeNull();
  });

  it("draf kosong dan clear menghapus entri; data rusak diabaikan", () => {
    saveBookingDraft("e1", draft);
    saveBookingDraft("e1", { ...draft, selection: {}, niks: {}, contactEmail: "" });
    expect(loadBookingDraft("e1", draft.expiresAt)).toBeNull();
    sessionStorage.setItem("rusuh.booking_draft.e1", "{bad");
    expect(loadBookingDraft("e1", draft.expiresAt)).toBeNull();
    saveBookingDraft("e1", draft);
    clearBookingDraft("e1");
    expect(loadBookingDraft("e1", draft.expiresAt)).toBeNull();
  });
});
