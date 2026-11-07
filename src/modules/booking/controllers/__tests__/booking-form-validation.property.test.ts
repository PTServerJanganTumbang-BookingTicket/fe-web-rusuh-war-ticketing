/**
 * Bug Condition Exploration Test — Form Validation Feedback
 *
 * **Validates: Requirements 1.1, 1.2, 1.3, 1.4**
 *
 * **Bug Condition**: `isBugCondition(input) WHERE input.action == "submit" AND NOT isBookingFormValid(form, slotKeys)`
 *
 * This test is EXPECTED TO FAIL on unfixed code — failure confirms the bug exists where
 * `submit.disabled` is `false` even when the form is invalid.
 *
 * **Expected Behavior**: When `isBookingFormValid()` returns `false`, `submit.disabled` MUST be `true`.
 *
 * **Bug**: `toBookingViewProps()` computes `submit.disabled` as:
 *   `count === 0 || remainingMs <= 0 || input.submitting`
 * but does NOT include `!isBookingFormValid(form, slotKeys)`.
 *
 * Test cases covered:
 * - Form with invalid NIK format (not 16 digits) → expect `submit.disabled === true`
 * - Form with empty `buyerName` → expect `submit.disabled === true`
 * - Form with invalid email format → expect `submit.disabled === true`
 * - Form with duplicate NIK across slots → expect `submit.disabled === true`
 * - Form with rejected NIK (Dukcapil status !== "valid") → expect `submit.disabled === true`
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

const emptyForm: BookingForm = {
  buyerName: "",
  contactEmail: "",
  niks: {},
  checks: {},
  touched: new Set(),
  submitted: false,
};

function buildViewInput(overrides: Partial<BookingViewInput> = {}): BookingViewInput {
  return {
    chrome: toSiteChrome(),
    eventId: "evt_test",
    session: baseSession,
    event,
    selection: { vip: 1 }, // Default: 1 ticket selected
    remainingMs: 287_000, // ~4:47 remaining
    form: emptyForm,
    submitting: false,
    onAdd: vi.fn(),
    onRemove: vi.fn(),
    onBuyerName: vi.fn(),
    onContactEmail: vi.fn(),
    onNik: vi.fn(),
    onNikBlur: vi.fn(),
    onFieldBlur: vi.fn(),
    onSubmit: vi.fn(),
    ...overrides,
  };
}

// ─── Arbitraries (Smart Generators) ──────────────────────────────────────────

/** Generate valid 16-digit NIK strings */
const validNikArb = fc.stringMatching(/^\d{16}$/);

/** Generate invalid NIK strings (not 16 digits) */
const invalidNikFormatArb = fc.oneof(
  fc.string({ minLength: 0, maxLength: 15 }), // Too short
  fc.string({ minLength: 17, maxLength: 20 }), // Too long
  fc.stringMatching(/^\d{1,15}$/), // Less than 16 digits
  fc.stringMatching(/^\d{17,}$/), // More than 16 digits
  fc.stringMatching(/^[a-zA-Z]{16}$/), // Letters instead of digits
  fc.stringMatching(/^\d{8}[a-zA-Z]{8}$/), // Mixed
);

/** Generate valid email strings */
const validEmailArb = fc
  .tuple(
    fc.stringMatching(/^[a-z0-9]{1,10}$/),
    fc.stringMatching(/^[a-z0-9]{1,10}$/),
    fc.stringMatching(/^[a-z]{2,5}$/),
  )
  .map(([local, domain, tld]) => `${local}@${domain}.${tld}`);

/** Generate invalid email strings */
const invalidEmailArb = fc.oneof(
  fc.constant(""), // Empty
  fc.constant("notanemail"), // No @
  fc.constant("no@domain"), // No .tld
  fc.constant("@example.com"), // No local part
  fc.constant("test@"), // No domain
  fc.string({ minLength: 1, maxLength: 20 }).filter((s) => !s.includes("@")), // No @ symbol
);

/** Generate non-empty buyer name */
const validBuyerNameArb = fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim() !== "");

/** Generate empty or whitespace-only buyer name */
const emptyBuyerNameArb = fc.oneof(fc.constant(""), fc.constant(" "), fc.constant("   "), fc.constant("\t"));

/** Generate rejected NIK check state */
// ─── Property Tests ──────────────────────────────────────────────────────────

describe("Bug Condition: Form Validation Feedback", () => {
  /**
   * Property 1: Form with invalid NIK format → submit.disabled === true
   *
   * When a ticket slot has a NIK that is not exactly 16 digits,
   * the submit button MUST be disabled.
   */
  it("Property 1: submit.disabled === true when NIK format is invalid (not 16 digits)", () => {
    fc.assert(
      fc.property(invalidNikFormatArb, validBuyerNameArb, validEmailArb, (invalidNik, buyerName, email) => {
        const form: BookingForm = {
          buyerName,
          contactEmail: email,
          niks: { "vip-0": invalidNik },
          checks: {},
          touched: new Set(["nik:vip-0", "buyerName", "contactEmail"]),
          submitted: true,
        };

        const slotKeys = ["vip-0"];

        // Verify that isBookingFormValid returns false for this input
        const isValid = isBookingFormValid(form, slotKeys);
        expect(isValid).toBe(false);

        // Build the view props
        const viewInput = buildViewInput({ form, selection: { vip: 1 } });
        const view = toBookingViewProps(viewInput);

        // BUG CONDITION: submit.disabled should be true when form is invalid
        // This test is EXPECTED TO FAIL because the bug exists
        expect(view.submit.disabled).toBe(true);
      }),
      { numRuns: 50 },
    );
  });

  /**
   * Property 2: Form with empty buyerName → submit.disabled === true
   *
   * When the buyer name is empty or whitespace-only,
   * the submit button MUST be disabled.
   */
  it("Property 2: submit.disabled === true when buyerName is empty", () => {
    fc.assert(
      fc.property(emptyBuyerNameArb, validNikArb, validEmailArb, (emptyName, nik, email) => {
        const form: BookingForm = {
          buyerName: emptyName,
          contactEmail: email,
          niks: { "vip-0": nik },
          checks: {},
          touched: new Set(["nik:vip-0", "buyerName", "contactEmail"]),
          submitted: true,
        };

        const slotKeys = ["vip-0"];

        // Verify that isBookingFormValid returns false for this input
        const isValid = isBookingFormValid(form, slotKeys);
        expect(isValid).toBe(false);

        // Build the view props
        const viewInput = buildViewInput({ form, selection: { vip: 1 } });
        const view = toBookingViewProps(viewInput);

        // BUG CONDITION: submit.disabled should be true when form is invalid
        // This test is EXPECTED TO FAIL because the bug exists
        expect(view.submit.disabled).toBe(true);
      }),
      { numRuns: 50 },
    );
  });

  /**
   * Property 3: Form with invalid email format → submit.disabled === true
   *
   * When the contact email is not a valid email format,
   * the submit button MUST be disabled.
   */
  it("Property 3: submit.disabled === true when email format is invalid", () => {
    fc.assert(
      fc.property(invalidEmailArb, validBuyerNameArb, validNikArb, (invalidEmail, buyerName, nik) => {
        const form: BookingForm = {
          buyerName,
          contactEmail: invalidEmail,
          niks: { "vip-0": nik },
          checks: {},
          touched: new Set(["nik:vip-0", "buyerName", "contactEmail"]),
          submitted: true,
        };

        const slotKeys = ["vip-0"];

        // Verify that isBookingFormValid returns false for this input
        const isValid = isBookingFormValid(form, slotKeys);
        expect(isValid).toBe(false);

        // Build the view props
        const viewInput = buildViewInput({ form, selection: { vip: 1 } });
        const view = toBookingViewProps(viewInput);

        // BUG CONDITION: submit.disabled should be true when form is invalid
        // This test is EXPECTED TO FAIL because the bug exists
        expect(view.submit.disabled).toBe(true);
      }),
      { numRuns: 50 },
    );
  });

  /**
   * Property 4: Form with duplicate NIK across slots → submit.disabled === true
   *
   * When two or more ticket slots have the same NIK (BR-02 violation),
   * the submit button MUST be disabled.
   */
  it("Property 4: submit.disabled === true when duplicate NIK exists across slots", () => {
    fc.assert(
      fc.property(validNikArb, validBuyerNameArb, validEmailArb, (duplicateNik, buyerName, email) => {
        // Create a form with 2 tickets having the same NIK
        const form: BookingForm = {
          buyerName,
          contactEmail: email,
          niks: {
            "vip-0": duplicateNik,
            "vip-1": duplicateNik, // Same NIK = duplicate
          },
          checks: {},
          touched: new Set(["nik:vip-0", "nik:vip-1", "buyerName", "contactEmail"]),
          submitted: true,
        };

        const slotKeys = ["vip-0", "vip-1"];

        // Verify that isBookingFormValid returns false for this input
        const isValid = isBookingFormValid(form, slotKeys);
        expect(isValid).toBe(false);

        // Build the view props with 2 tickets
        const viewInput = buildViewInput({ form, selection: { vip: 2 } });
        const view = toBookingViewProps(viewInput);

        // BUG CONDITION: submit.disabled should be true when form is invalid
        // This test is EXPECTED TO FAIL because the bug exists
        expect(view.submit.disabled).toBe(true);
      }),
      { numRuns: 50 },
    );
  });

  /**
   * Property 5: Form with rejected NIK (Dukcapil status !== "valid") → submit.disabled === true
   *
   * When a NIK has been checked by Dukcapil and rejected (not_found, inactive, or used),
   * the submit button MUST be disabled.
   */
  it("Property 5: submit.disabled === true when NIK is rejected by Dukcapil", () => {
    fc.assert(
      fc.property(validNikArb, validBuyerNameArb, validEmailArb, (nik, buyerName, email) => {
        // Generate a rejected check state for the NIK
        const rejectedStatuses: Array<"not_found" | "inactive" | "used"> = ["not_found", "inactive", "used"];
        for (const rejectedStatus of rejectedStatuses) {
          const form: BookingForm = {
            buyerName,
            contactEmail: email,
            niks: { "vip-0": nik },
            checks: {
              "vip-0": { nik, state: "done", result: { status: rejectedStatus } },
            },
            touched: new Set(["nik:vip-0", "buyerName", "contactEmail"]),
            submitted: true,
          };

          const slotKeys = ["vip-0"];

          // Verify that isBookingFormValid returns false for this input
          const isValid = isBookingFormValid(form, slotKeys);
          expect(isValid).toBe(false);

          // Build the view props
          const viewInput = buildViewInput({ form, selection: { vip: 1 } });
          const view = toBookingViewProps(viewInput);

          // BUG CONDITION: submit.disabled should be true when form is invalid
          // This test is EXPECTED TO FAIL because the bug exists
          expect(view.submit.disabled).toBe(true);
        }
      }),
      { numRuns: 30 }, // Lower numRuns since we iterate 3 statuses internally
    );
  });

  /**
   * Combined Property: General Bug Condition
   *
   * For ANY form state where `isBookingFormValid(form, slotKeys)` returns false,
   * AND there are tickets selected (count > 0), AND time has not expired (remainingMs > 0),
   * AND not submitting:
   *
   * `submit.disabled` MUST be `true`.
   *
   * This is the general bug condition property.
   */
  it("General Bug Condition: submit.disabled === true whenever isBookingFormValid() === false", () => {
    // Test with concrete failing cases
    const invalidCases: Array<{ form: BookingForm; description: string }> = [
      {
        description: "invalid NIK format",
        form: {
          buyerName: "Test User",
          contactEmail: "test@example.com",
          niks: { "vip-0": "12345" }, // Not 16 digits
          checks: {},
          touched: new Set(),
          submitted: true,
        },
      },
      {
        description: "empty buyer name",
        form: {
          buyerName: "",
          contactEmail: "test@example.com",
          niks: { "vip-0": "3171000000000022" },
          checks: {},
          touched: new Set(),
          submitted: true,
        },
      },
      {
        description: "invalid email",
        form: {
          buyerName: "Test User",
          contactEmail: "notanemail",
          niks: { "vip-0": "3171000000000022" },
          checks: {},
          touched: new Set(),
          submitted: true,
        },
      },
      {
        description: "duplicate NIK",
        form: {
          buyerName: "Test User",
          contactEmail: "test@example.com",
          niks: { "vip-0": "3171000000000022", "vip-1": "3171000000000022" },
          checks: {},
          touched: new Set(),
          submitted: true,
        },
      },
      {
        description: "rejected NIK (not_found)",
        form: {
          buyerName: "Test User",
          contactEmail: "test@example.com",
          niks: { "vip-0": "3171000000000022" },
          checks: { "vip-0": { nik: "3171000000000022", state: "done", result: { status: "not_found" } } },
          touched: new Set(),
          submitted: true,
        },
      },
    ];

    for (const { form, description } of invalidCases) {
      const slotKeys = Object.keys(form.niks);
      const selection = slotKeys.length === 1 ? { vip: 1 } : { vip: 2 };

      // Verify that isBookingFormValid returns false
      const isValid = isBookingFormValid(form, slotKeys);
      expect(isValid, `Expected form to be invalid for case: ${description}`).toBe(false);

      // Build the view
      const viewInput = buildViewInput({
        form,
        selection,
        remainingMs: 287_000, // Time not expired
        submitting: false,
      });
      const view = toBookingViewProps(viewInput);

      // BUG CONDITION: submit.disabled should be true when form is invalid
      // This assertion will FAIL because the current implementation doesn't check isBookingFormValid
      expect(
        view.submit.disabled,
        `Expected submit.disabled=true for case: ${description}, but got ${view.submit.disabled}`,
      ).toBe(true);
    }
  });
});
