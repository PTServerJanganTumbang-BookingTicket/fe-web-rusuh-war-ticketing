/**
 * Preservation Property Tests — Valid Form Submit Behavior
 *
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7**
 *
 * **Property 2: Preservation** - These tests capture the OBSERVED behavior on UNFIXED code
 * for non-buggy inputs (valid form submissions and other legitimate disabled conditions).
 *
 * **Observation-First Methodology**:
 * These tests document the correct behavior that MUST be preserved after the fix:
 * - WHEN all fields valid AND count > 0 AND remainingMs > 0 AND !submitting THEN `submit.disabled === false`
 * - WHEN countdown timer expires (remainingMs <= 0) THEN `submit.disabled === true`
 * - WHEN no ticket selected (count === 0) THEN `submit.disabled === true`
 * - WHEN submit in progress (submitting === true) THEN `submit.disabled === true`
 * - WHEN NIK valid and verified by Dukcapil THEN display success message
 * - WHEN NIK rejected by Dukcapil THEN display error based on status
 *
 * **Expected Outcome**: All tests PASS on unfixed code (confirms baseline behavior to preserve)
 */

import { describe, expect, it, vi } from "vitest";
import * as fc from "fast-check";
import { toSiteChrome } from "@/core/controllers/site-chrome.utils";
import type { BookingSession } from "../../domain/booking-session.model";
import {
  isBookingFormValid,
  toBookingViewProps,
  type BookingForm,
  type BookingViewInput,
} from "../booking.mapper";

// ─── Test Fixtures ───────────────────────────────────────────────────────────

const baseSession: BookingSession = {
  eventName: "Konser Test",
  expiresAt: "2026-10-19T10:05:00.000Z",
  serverNow: "2026-10-19T10:00:00.000Z",
  maskedNik: null,
  quota: { max: 3, used: 0, remaining: 3 },
  categories: [
    { id: "vip", name: "VIP", description: "VIP area", priceIdr: 1_500_000, stock: 100 },
    { id: "festival", name: "Festival", description: "Festival area", priceIdr: 850_000, stock: 200 },
  ],
};

const event = {
  name: "Konser Test",
  category: "LIVE MUSIC",
  city: "Jakarta",
  venue: "GBK",
  date: "2026-12-25",
  imageUrl: "/images/concert.webp",
};

function buildViewInput(overrides: Partial<BookingViewInput> = {}): BookingViewInput {
  return {
    chrome: toSiteChrome(),
    eventId: "evt_test",
    session: baseSession,
    event,
    selection: { vip: 1 },
    remainingMs: 287_000, // ~4:47 remaining
    form: {
      contactEmail: "",
      niks: {},
      checks: {},
      touched: new Set(),
      submitted: false,
    },
    submitting: false,
    onAdd: vi.fn(),
    onRemove: vi.fn(),
    onContactEmail: vi.fn(),
    onNik: vi.fn(),
    onNikBlur: vi.fn(),
    onFieldBlur: vi.fn(),
    onSubmit: vi.fn(),
    ...overrides,
  };
}

// ─── Smart Generators (Arbitraries) ──────────────────────────────────────────

/** Generate valid 16-digit NIK strings */
const validNikArb = fc.stringMatching(/^\d{16}$/);

/** Generate valid email strings */
const validEmailArb = fc
  .tuple(
    fc.stringMatching(/^[a-z0-9]{1,10}$/),
    fc.stringMatching(/^[a-z0-9]{1,10}$/),
    fc.stringMatching(/^[a-z]{2,5}$/),
  )
  .map(([local, domain, tld]) => `${local}@${domain}.${tld}`);

/** Generate positive remaining time (valid countdown) */
const positiveRemainingMsArb = fc.integer({ min: 1, max: 600_000 }); // 1ms to 10 minutes

/** Generate expired time (zero or negative) */
const expiredRemainingMsArb = fc.integer({ min: -60_000, max: 0 });

/** Generate rejected NIK check states */
type RejectedStatus = "not_found" | "inactive" | "used";

// ─── Preservation Property Tests ─────────────────────────────────────────────

describe("Preservation Property: Valid Form Submit Behavior", () => {
  /**
   * Property 1: Valid form with all fields correct → submit.disabled === false
   *
   * WHEN isBookingFormValid() === true AND count > 0 AND remainingMs > 0 AND !submitting
   * THEN submit.disabled === false
   *
   * This test verifies that valid forms can submit (baseline behavior to preserve).
   */
  it("Property 1: submit.disabled === false when form is valid, has tickets, time remaining, not submitting", () => {
    fc.assert(
      fc.property(
        validEmailArb,
        validNikArb,
        validNikArb,
        positiveRemainingMsArb,
        (email, nik1, _nik2, remainingMs) => {
          const selection = { vip: 1 };
          const form: BookingForm = {
            contactEmail: email,
            niks: { "vip-0": nik1 },
            checks: {},
            touched: new Set(["contactEmail", "nik:vip-0"]),
            submitted: false,
          };

          const slotKeys = ["vip-0"];

          // Verify form is valid
          const isValid = isBookingFormValid(form, slotKeys);
          expect(isValid).toBe(true);

          // Build view with valid conditions
          const viewInput = buildViewInput({
            form,
            selection,
            remainingMs,
            submitting: false,
          });
          const view = toBookingViewProps(viewInput);

          // PRESERVATION: Valid form should be submittable (disabled === false)
          expect(view.submit.disabled).toBe(false);
        },
      ),
      { numRuns: 50 },
    );
  });

  /**
   * Property 2: Valid form with remainingMs <= 0 → submit.disabled === true
   *
   * WHEN countdown timer expires (remainingMs <= 0)
   * THEN submit.disabled === true (regardless of form validity)
   *
   * This preserves the existing countdown expiration behavior.
   */
  it("Property 2: submit.disabled === true when countdown timer expired (remainingMs <= 0)", () => {
    fc.assert(
      fc.property(validEmailArb, validNikArb, expiredRemainingMsArb, (email, nik, expiredMs) => {
        const selection = { vip: 1 };
        const form: BookingForm = {
          contactEmail: email,
          niks: { "vip-0": nik },
          checks: {},
          touched: new Set(["contactEmail", "nik:vip-0"]),
          submitted: false,
        };

        // Build view with expired time
        const viewInput = buildViewInput({
          form,
          selection,
          remainingMs: expiredMs,
          submitting: false,
        });
        const view = toBookingViewProps(viewInput);

        // PRESERVATION: Expired countdown must disable submit
        expect(view.submit.disabled).toBe(true);
      }),
      { numRuns: 50 },
    );
  });

  /**
   * Property 3: count === 0 → submit.disabled === true
   *
   * WHEN no ticket selected (count === 0)
   * THEN submit.disabled === true
   *
   * This preserves the existing "no tickets" disabled behavior.
   */
  it("Property 3: submit.disabled === true when no ticket selected (count === 0)", () => {
    fc.assert(
      fc.property(validEmailArb, positiveRemainingMsArb, (email, remainingMs) => {
        const selection = {}; // No tickets
        const form: BookingForm = {
          contactEmail: email,
          niks: {},
          checks: {},
          touched: new Set(["contactEmail"]),
          submitted: false,
        };

        // Build view with no selection
        const viewInput = buildViewInput({
          form,
          selection,
          remainingMs,
          submitting: false,
        });
        const view = toBookingViewProps(viewInput);

        // PRESERVATION: No tickets must disable submit
        expect(view.submit.disabled).toBe(true);
      }),
      { numRuns: 50 },
    );
  });

  /**
   * Property 4: submitting === true → submit.disabled === true
   *
   * WHEN submit in progress (submitting === true)
   * THEN submit.disabled === true (and busy === true)
   *
   * This preserves the existing loading state behavior.
   */
  it("Property 4: submit.disabled === true when submitting in progress (submitting === true)", () => {
    fc.assert(
      fc.property(validEmailArb, validNikArb, positiveRemainingMsArb, (email, nik, remainingMs) => {
        const selection = { vip: 1 };
        const form: BookingForm = {
          contactEmail: email,
          niks: { "vip-0": nik },
          checks: {},
          touched: new Set(["contactEmail", "nik:vip-0"]),
          submitted: false,
        };

        // Build view with submitting === true
        const viewInput = buildViewInput({
          form,
          selection,
          remainingMs,
          submitting: true, // Submitting in progress
        });
        const view = toBookingViewProps(viewInput);

        // PRESERVATION: Submitting must disable button and show busy state
        expect(view.submit.disabled).toBe(true);
        expect(view.submit.busy).toBe(true);
      }),
      { numRuns: 50 },
    );
  });

  /**
   * Property 5: NIK valid dan terverifikasi Dukcapil → tampilkan success message
   *
   * WHEN NIK is valid and verified by Dukcapil (status === "valid")
   * THEN display success message with verified name
   *
   * This preserves the existing Dukcapil verification success behavior.
   */
  it("Property 5: display success message when NIK is valid and verified by Dukcapil", () => {
    fc.assert(
      fc.property(
        validNikArb,
        fc.string({ minLength: 1, maxLength: 30 }).filter((s) => s.trim() !== ""),
        (nik, verifiedName) => {
          const selection = { vip: 1 };
          const form: BookingForm = {
            contactEmail: "test@example.com",
            niks: { "vip-0": nik },
            checks: {
              "vip-0": {
                nik,
                state: "done",
                result: { status: "valid", name: verifiedName },
              },
            },
            touched: new Set(["contactEmail", "nik:vip-0"]),
            submitted: false,
          };

          const viewInput = buildViewInput({
            form,
            selection,
            remainingMs: 287_000,
            submitting: false,
          });
          const view = toBookingViewProps(viewInput);

          // PRESERVATION: Verified NIK must show success message
          const holder = view.holders?.items[0];
          expect(holder).toBeDefined();
          expect(holder?.nik.success).toContain(verifiedName);
          expect(holder?.nik.error).toBeUndefined();
        },
      ),
      { numRuns: 30 },
    );
  });

  /**
   * Property 6: NIK ditolak Dukcapil → tampilkan error sesuai status
   *
   * WHEN NIK is rejected by Dukcapil (status !== "valid")
   * THEN display appropriate error message based on status
   *
   * This preserves the existing Dukcapil rejection error display behavior.
   */
  it("Property 6: display error message when NIK is rejected by Dukcapil", () => {
    const rejectedStatuses: Array<{ status: RejectedStatus; expectedContains: string }> = [
      { status: "not_found", expectedContains: "tidak ditemukan" },
      { status: "inactive", expectedContains: "tidak aktif" },
      { status: "used", expectedContains: "sudah dipakai" },
    ];

    fc.assert(
      fc.property(validNikArb, (nik) => {
        for (const { status, expectedContains } of rejectedStatuses) {
          const selection = { vip: 1 };
          const form: BookingForm = {
            contactEmail: "test@example.com",
            niks: { "vip-0": nik },
            checks: {
              "vip-0": {
                nik,
                state: "done",
                result: { status },
              },
            },
            touched: new Set(["contactEmail", "nik:vip-0"]),
            submitted: true, // Show errors
          };

          const viewInput = buildViewInput({
            form,
            selection,
            remainingMs: 287_000,
            submitting: false,
          });
          const view = toBookingViewProps(viewInput);

          // PRESERVATION: Rejected NIK must show error message
          const holder = view.holders?.items[0];
          expect(holder).toBeDefined();
          expect(holder?.nik.error).toBeDefined();
          expect(holder?.nik.error?.toLowerCase()).toContain(expectedContains.toLowerCase());
          expect(holder?.nik.success).toBeUndefined();
        }
      }),
      { numRuns: 20 },
    );
  });

  /**
   * Property 7: Checking NIK state → display "checking" message
   *
   * WHEN NIK check is in progress (state === "checking")
   * THEN display checking/loading message
   *
   * This preserves the existing Dukcapil checking state behavior.
   */
  it("Property 7: display checking message when NIK verification is in progress", () => {
    fc.assert(
      fc.property(validNikArb, (nik) => {
        const selection = { vip: 1 };
        const form: BookingForm = {
          contactEmail: "test@example.com",
          niks: { "vip-0": nik },
          checks: {
            "vip-0": {
              nik,
              state: "checking",
            },
          },
          touched: new Set(["contactEmail", "nik:vip-0"]),
          submitted: false,
        };

        const viewInput = buildViewInput({
          form,
          selection,
          remainingMs: 287_000,
          submitting: false,
        });
        const view = toBookingViewProps(viewInput);

        // PRESERVATION: Checking state must show checking message
        const holder = view.holders?.items[0];
        expect(holder).toBeDefined();
        // Should have success message with "checking" info, no error
        expect(holder?.nik.success).toBeDefined();
        expect(holder?.nik.error).toBeUndefined();
      }),
      { numRuns: 30 },
    );
  });

  /**
   * Combined Preservation Property
   *
   * For ANY form state where:
   * - isBookingFormValid(form, slotKeys) === true
   * - count > 0
   * - remainingMs > 0
   * - submitting === false
   *
   * THEN submit.disabled === false
   *
   * This is the general preservation property for valid form submissions.
   */
  it("General Preservation: submit.disabled === false for all valid form states", () => {
    fc.assert(
      fc.property(
        validEmailArb,
        validNikArb,
        validNikArb,
        validNikArb,
        fc.integer({ min: 1, max: 3 }), // 1-3 tickets
        positiveRemainingMsArb,
        (email, nik1, nik2, nik3, ticketCount, remainingMs) => {
          // Generate unique NIKs - each nik is exactly 16 chars from validNikArb
          const baseNiks = [nik1, nik2, nik3];
          const uniqueNiks = baseNiks.map((nik, i) => {
            // Make each NIK unique by modifying last digit
            const base = nik.slice(0, 15);
            return `${base}${(parseInt(nik[15]!, 10) + i) % 10}`;
          });

          // Build selection based on ticket count
          const selection: Record<string, number> = { vip: Math.min(ticketCount, 2) };
          if (ticketCount > 2) {
            selection.festival = ticketCount - 2;
          }

          // Build form with valid data
          const slotKeys: string[] = [];
          const niks: Record<string, string> = {};
          let nikIdx = 0;

          for (const [categoryId, count] of Object.entries(selection)) {
            for (let i = 0; i < count; i++) {
              const key = `${categoryId}-${i}`;
              slotKeys.push(key);
              // uniqueNiks always has 3 elements, nikIdx is at most 2 for max 3 tickets
              niks[key] = uniqueNiks[nikIdx]!;
              nikIdx++;
            }
          }

          const form: BookingForm = {
            contactEmail: email,
            niks,
            checks: {},
            touched: new Set(["contactEmail", ...slotKeys.map((k) => `nik:${k}`)]),
            submitted: false,
          };

          // Verify form is valid
          const isValid = isBookingFormValid(form, slotKeys);
          if (!isValid) {
            // Skip if form happens to be invalid (should be rare with unique NIKs)
            return;
          }

          const viewInput = buildViewInput({
            form,
            selection,
            remainingMs,
            submitting: false,
          });
          const view = toBookingViewProps(viewInput);

          // PRESERVATION: Valid form with valid conditions must be submittable
          expect(view.submit.disabled).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });
});

describe("Preservation Property: Explicit Concrete Cases", () => {
  /**
   * Concrete test cases to ensure preservation of expected behavior.
   * These serve as documentation of the correct behavior to maintain.
   */

  it("valid single ticket form → submit enabled", () => {
    const form: BookingForm = {
      contactEmail: "john@example.com",
      niks: { "vip-0": "3171000000000022" },
      checks: {},
      touched: new Set(["contactEmail", "nik:vip-0"]),
      submitted: false,
    };

    const viewInput = buildViewInput({
      form,
      selection: { vip: 1 },
      remainingMs: 287_000,
      submitting: false,
    });
    const view = toBookingViewProps(viewInput);

    expect(isBookingFormValid(form, ["vip-0"])).toBe(true);
    expect(view.submit.disabled).toBe(false);
  });

  it("valid multi-ticket form with unique NIKs → submit enabled", () => {
    const form: BookingForm = {
      contactEmail: "john@example.com",
      niks: {
        "vip-0": "3171000000000022",
        "vip-1": "3171000000000033",
        "festival-0": "3171000000000044",
      },
      checks: {},
      touched: new Set(),
      submitted: false,
    };

    const viewInput = buildViewInput({
      form,
      selection: { vip: 2, festival: 1 },
      remainingMs: 287_000,
      submitting: false,
    });
    const view = toBookingViewProps(viewInput);

    expect(isBookingFormValid(form, ["vip-0", "vip-1", "festival-0"])).toBe(true);
    expect(view.submit.disabled).toBe(false);
  });

  it("valid form but time expired → submit disabled", () => {
    const form: BookingForm = {
      contactEmail: "john@example.com",
      niks: { "vip-0": "3171000000000022" },
      checks: {},
      touched: new Set(),
      submitted: false,
    };

    const viewInput = buildViewInput({
      form,
      selection: { vip: 1 },
      remainingMs: 0, // Expired
      submitting: false,
    });
    const view = toBookingViewProps(viewInput);

    expect(view.submit.disabled).toBe(true);
  });

  it("valid form but no tickets → submit disabled", () => {
    const form: BookingForm = {
      contactEmail: "john@example.com",
      niks: {},
      checks: {},
      touched: new Set(),
      submitted: false,
    };

    const viewInput = buildViewInput({
      form,
      selection: {}, // No tickets
      remainingMs: 287_000,
      submitting: false,
    });
    const view = toBookingViewProps(viewInput);

    expect(view.submit.disabled).toBe(true);
  });

  it("valid form but submitting → submit disabled with busy state", () => {
    const form: BookingForm = {
      contactEmail: "john@example.com",
      niks: { "vip-0": "3171000000000022" },
      checks: {},
      touched: new Set(),
      submitted: false,
    };

    const viewInput = buildViewInput({
      form,
      selection: { vip: 1 },
      remainingMs: 287_000,
      submitting: true, // In progress
    });
    const view = toBookingViewProps(viewInput);

    expect(view.submit.disabled).toBe(true);
    expect(view.submit.busy).toBe(true);
  });

  it("verified NIK shows success message with name", () => {
    const form: BookingForm = {
      contactEmail: "john@example.com",
      niks: { "vip-0": "3171000000000022" },
      checks: {
        "vip-0": {
          nik: "3171000000000022",
          state: "done",
          result: { status: "valid", name: "VERIFIED USER" },
        },
      },
      touched: new Set(),
      submitted: false,
    };

    const viewInput = buildViewInput({
      form,
      selection: { vip: 1 },
    });
    const view = toBookingViewProps(viewInput);

    const holder = view.holders?.items[0];
    expect(holder?.nik.success).toContain("VERIFIED USER");
    expect(holder?.nik.error).toBeUndefined();
  });

  it("rejected NIK shows appropriate error messages", () => {
    const testCases: Array<{ status: "not_found" | "inactive" | "used"; errorContains: string }> = [
      { status: "not_found", errorContains: "tidak ditemukan" },
      { status: "inactive", errorContains: "tidak aktif" },
      { status: "used", errorContains: "sudah dipakai" },
    ];

    for (const { status, errorContains } of testCases) {
      const form: BookingForm = {
        contactEmail: "john@example.com",
        niks: { "vip-0": "3171000000000022" },
        checks: {
          "vip-0": {
            nik: "3171000000000022",
            state: "done",
            result: { status },
          },
        },
        touched: new Set(["nik:vip-0"]),
        submitted: true,
      };

      const viewInput = buildViewInput({
        form,
        selection: { vip: 1 },
      });
      const view = toBookingViewProps(viewInput);

      const holder = view.holders?.items[0];
      expect(holder?.nik.error?.toLowerCase()).toContain(errorContains.toLowerCase());
      expect(holder?.nik.success).toBeUndefined();
    }
  });
});
