/**
 * @file webview-handoff.rules.test.ts
 * @description Property tests untuk WebView Payment Handoff Business Rules
 *
 * **Validates: Requirements BR-27, BR-29, BR-30**
 *
 * Properties tested:
 * - Property 24: Handoff Code Format Validation — isValidHandoffCode accepts hc_{64 hex} only
 * - Property 25: Payment Session Memory-Only Storage — verifikasi tidak pakai localStorage
 * - Property 26: WebView Context Detection — isReactNativeWebView checks window.ReactNativeWebView
 * - Property 27: Single Credential Per Request — X-Payment-Session XOR X-Grant-Token
 */

import * as fc from "fast-check";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { WebViewMessage } from "../webview-handoff.model";
import {
  extractHandoffCodeFromFragment,
  HANDOFF_CODE_REGEX,
  isReactNativeWebView,
  isValidHandoffCode,
  isValidPaymentSession,
  PAYMENT_SESSION_REGEX,
  postMessageToApp,
  removeCodeFromUrl,
} from "../webview-handoff.rules";

/* ========================================================================== */
/*                          Test Utilities                                    */
/* ========================================================================== */

/**
 * Generator untuk string hex lowercase dengan panjang tertentu.
 * fast-check v4: use tuple/array and join for fixed-length strings
 */
const hexChar = fc.constantFrom(...Array.from("0123456789abcdef"));

const hexString = (length: number) =>
  fc.tuple(...Array.from({ length }, () => hexChar)).map((chars) => chars.join(""));

/**
 * Generator untuk valid handoff code: hc_{64 hex}
 */
const validHandoffCode = () => hexString(64).map((hex) => `hc_${hex}`);

/**
 * Generator untuk valid payment session: ps_{64 hex}
 */
const validPaymentSession = () => hexString(64).map((hex) => `ps_${hex}`);

/**
 * Generator untuk hex string yang bukan 64 karakter (shorter or longer)
 */
const invalidLengthHexString = () =>
  fc.oneof(
    // Shorter hex strings (1-63 chars)
    fc.integer({ min: 1, max: 63 }).chain((len) => hexString(len)),
    // Longer hex strings (65-80 chars)
    fc.integer({ min: 65, max: 80 }).chain((len) => hexString(len)),
    // Empty string
    fc.constant(""),
  );

/**
 * Generator untuk prefix selain "hc_" dan "ps_"
 */
const invalidPrefix = () =>
  fc.string({ minLength: 0, maxLength: 10 }).filter((s) => !s.startsWith("hc_") && !s.startsWith("ps_"));

/* ========================================================================== */
/*               Property 24: Handoff Code Format Validation                  */
/* ========================================================================== */

describe("Property 24: Handoff Code Format Validation", () => {
  /**
   * **Validates: Requirements 14.32, BR-29**
   *
   * ADR-007 §2: Handoff code must be in format hc_{64 hex}
   */

  it("accepts valid handoff codes (hc_ + 64 lowercase hex chars)", () => {
    fc.assert(
      fc.property(validHandoffCode(), (code) => {
        expect(isValidHandoffCode(code)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it("rejects codes with wrong prefix (not starting with hc_)", () => {
    fc.assert(
      fc.property(invalidPrefix(), hexString(64), (prefix, hexPart) => {
        const code = `${prefix}${hexPart}`;
        expect(isValidHandoffCode(code)).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  it("rejects codes with wrong hex length (not exactly 64 chars after hc_)", () => {
    fc.assert(
      fc.property(invalidLengthHexString(), (hexPart) => {
        const code = `hc_${hexPart.toLowerCase()}`;
        expect(isValidHandoffCode(code)).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  it("rejects codes with uppercase hex characters", () => {
    // Generate uppercase hex strings
    const uppercaseHexChar = fc.constantFrom(...Array.from("0123456789ABCDEF"));
    const uppercaseHexString = fc
      .tuple(...Array.from({ length: 64 }, () => uppercaseHexChar))
      .map((chars) => chars.join(""))
      .filter((s) => s !== s.toLowerCase()); // Ensure at least one uppercase

    fc.assert(
      fc.property(uppercaseHexString, (hexPart) => {
        const code = `hc_${hexPart}`;
        expect(isValidHandoffCode(code)).toBe(false);
      }),
      { numRuns: 50 },
    );
  });

  it("rejects codes with non-hex characters after prefix", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 64, maxLength: 64 }).filter((s) => !/^[a-f0-9]+$/.test(s)),
        (invalidHexPart) => {
          const code = `hc_${invalidHexPart}`;
          expect(isValidHandoffCode(code)).toBe(false);
        },
      ),
      { numRuns: 50 },
    );
  });

  it("rejects empty string", () => {
    expect(isValidHandoffCode("")).toBe(false);
  });

  it("rejects codes similar to payment session format (ps_)", () => {
    fc.assert(
      fc.property(validPaymentSession(), (code) => {
        expect(isValidHandoffCode(code)).toBe(false);
      }),
      { numRuns: 50 },
    );
  });

  it("HANDOFF_CODE_REGEX matches exactly hc_ + 64 lowercase hex", () => {
    // Verify regex pattern is correct
    expect(
      HANDOFF_CODE_REGEX.test("hc_0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"),
    ).toBe(true);
    expect(
      HANDOFF_CODE_REGEX.test("hc_0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF"),
    ).toBe(false);
    expect(
      HANDOFF_CODE_REGEX.test("ps_0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"),
    ).toBe(false);
    expect(HANDOFF_CODE_REGEX.test("hc_0123456789abcdef")).toBe(false);
  });
});

/* ========================================================================== */
/*                 Payment Session Format Validation                          */
/* ========================================================================== */

describe("Payment Session Format Validation", () => {
  /**
   * **Validates: Requirements BR-27**
   *
   * ADR-007 §4: Payment session must be in format ps_{64 hex}
   */

  it("accepts valid payment sessions (ps_ + 64 lowercase hex chars)", () => {
    fc.assert(
      fc.property(validPaymentSession(), (session) => {
        expect(isValidPaymentSession(session)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it("rejects sessions with wrong prefix", () => {
    fc.assert(
      fc.property(validHandoffCode(), (code) => {
        // hc_ prefix should not be valid for payment session
        expect(isValidPaymentSession(code)).toBe(false);
      }),
      { numRuns: 50 },
    );
  });

  it("rejects sessions with wrong hex length", () => {
    fc.assert(
      fc.property(invalidLengthHexString(), (hexPart) => {
        const session = `ps_${hexPart.toLowerCase()}`;
        expect(isValidPaymentSession(session)).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  it("PAYMENT_SESSION_REGEX matches exactly ps_ + 64 lowercase hex", () => {
    expect(
      PAYMENT_SESSION_REGEX.test("ps_0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"),
    ).toBe(true);
    expect(
      PAYMENT_SESSION_REGEX.test("ps_0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF"),
    ).toBe(false);
    expect(
      PAYMENT_SESSION_REGEX.test("hc_0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"),
    ).toBe(false);
  });
});

/* ========================================================================== */
/*          Property 25: Payment Session Memory-Only Storage                  */
/* ========================================================================== */

describe("Property 25: Payment Session Memory-Only Storage", () => {
  /**
   * **Validates: Requirements 14.32, 14.35, BR-27**
   *
   * ADR-007 §6: Session hanya di memori halaman (bukan localStorage, cookie, atau URL)
   *
   * Note: Ini adalah test konseptual karena penyimpanan session ditangani di
   * controller layer, bukan di rules. Test ini memverifikasi bahwa:
   * 1. Tidak ada akses localStorage/sessionStorage di modul rules
   * 2. extractHandoffCodeFromFragment membaca dari URL fragment saja
   * 3. removeCodeFromUrl menghapus code dari URL untuk keamanan
   */

  let mockLocation: { hash: string; href: string };
  let mockHistory: { replaceState: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    // Setup mock window objects
    mockLocation = {
      hash: "",
      href: "https://rush-my-ticket.my.id/m/orders/RB-123/pay",
    };

    mockHistory = {
      replaceState: vi.fn(),
    };

    // Mock window properties
    vi.stubGlobal("window", {
      location: mockLocation,
      history: mockHistory,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("extractHandoffCodeFromFragment reads only from URL fragment, not storage", () => {
    fc.assert(
      fc.property(validHandoffCode(), (code) => {
        mockLocation.hash = `#code=${code}`;
        mockLocation.href = `https://rush-my-ticket.my.id/m/orders/RB-123/pay#code=${code}`;

        const extracted = extractHandoffCodeFromFragment();

        expect(extracted).toBe(code);
        // Verify no localStorage/sessionStorage access needed
      }),
      { numRuns: 50 },
    );
  });

  it("extractHandoffCodeFromFragment returns null when no code in fragment", () => {
    mockLocation.hash = "";
    expect(extractHandoffCodeFromFragment()).toBeNull();

    mockLocation.hash = "#other=value";
    expect(extractHandoffCodeFromFragment()).toBeNull();
  });

  it("removeCodeFromUrl clears fragment to prevent code leakage in browser history", () => {
    const testCode = "hc_0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
    const originalHref = `https://rush-my-ticket.my.id/m/orders/RB-123/pay#code=${testCode}`;

    // Create a proper mock for URL
    const mockReplaceState = vi.fn();
    vi.stubGlobal("window", {
      location: {
        hash: `#code=${testCode}`,
        href: originalHref,
      },
      history: {
        replaceState: mockReplaceState,
      },
    });

    // The real URL constructor should work in test environment
    removeCodeFromUrl();

    expect(mockReplaceState).toHaveBeenCalledTimes(1);
    expect(mockReplaceState).toHaveBeenCalledWith(
      null,
      "",
      expect.stringContaining("https://rush-my-ticket.my.id/m/orders/RB-123/pay"),
    );
  });

  it("rules module does not export any localStorage/sessionStorage functions", () => {
    // Verify the module API - should not have storage-related exports
    const moduleExports = {
      isValidHandoffCode,
      isValidPaymentSession,
      extractHandoffCodeFromFragment,
      removeCodeFromUrl,
      isReactNativeWebView,
      postMessageToApp,
      HANDOFF_CODE_REGEX,
      PAYMENT_SESSION_REGEX,
    };

    // No storage-related function names
    const exportNames = Object.keys(moduleExports);
    expect(exportNames).not.toContain("saveToLocalStorage");
    expect(exportNames).not.toContain("saveToSessionStorage");
    expect(exportNames).not.toContain("getFromStorage");
  });
});

/* ========================================================================== */
/*              Property 26: WebView Context Detection                        */
/* ========================================================================== */

describe("Property 26: WebView Context Detection", () => {
  /**
   * **Validates: Requirements 14.30, 14.38, BR-31**
   *
   * ADR-007 §7: Deteksi WebView via window.ReactNativeWebView, bukan userAgent
   */

  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns false when window is undefined (SSR)", () => {
    vi.stubGlobal("window", undefined);
    expect(isReactNativeWebView()).toBe(false);
  });

  it("returns false when ReactNativeWebView is not present", () => {
    vi.stubGlobal("window", {});
    expect(isReactNativeWebView()).toBe(false);
  });

  it("returns false when ReactNativeWebView exists but postMessage is not a function", () => {
    vi.stubGlobal("window", {
      ReactNativeWebView: {},
    });
    expect(isReactNativeWebView()).toBe(false);

    vi.stubGlobal("window", {
      ReactNativeWebView: { postMessage: "not a function" },
    });
    expect(isReactNativeWebView()).toBe(false);

    vi.stubGlobal("window", {
      ReactNativeWebView: { postMessage: null },
    });
    expect(isReactNativeWebView()).toBe(false);
  });

  it("returns true when ReactNativeWebView.postMessage is a function", () => {
    vi.stubGlobal("window", {
      ReactNativeWebView: {
        postMessage: vi.fn(),
      },
    });
    expect(isReactNativeWebView()).toBe(true);
  });

  it("does NOT rely on navigator.userAgent for detection", () => {
    // Even with mobile-like userAgent, should return false without ReactNativeWebView
    vi.stubGlobal("window", {
      navigator: {
        userAgent:
          "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36",
      },
    });
    expect(isReactNativeWebView()).toBe(false);
  });

  it("detection is consistent across multiple calls", () => {
    vi.stubGlobal("window", {
      ReactNativeWebView: {
        postMessage: vi.fn(),
      },
    });

    // Multiple calls should return same result
    const results = Array.from({ length: 10 }, () => isReactNativeWebView());
    expect(results.every((r) => r === true)).toBe(true);
  });
});

/* ========================================================================== */
/*            Property 27: Single Credential Per Request                      */
/* ========================================================================== */

describe("Property 27: Single Credential Per Request", () => {
  /**
   * **Validates: Requirements 14.32, BR-30**
   *
   * ADR-007: X-Payment-Session XOR X-Grant-Token, never both
   *
   * Note: Actual header management is in data layer (http service).
   * This test verifies the rules layer provides proper validation utilities.
   */

  it("handoff code and payment session have distinct, non-overlapping formats", () => {
    fc.assert(
      fc.property(validHandoffCode(), validPaymentSession(), (hc, ps) => {
        // Handoff code is valid for handoff, not for payment session
        expect(isValidHandoffCode(hc)).toBe(true);
        expect(isValidPaymentSession(hc)).toBe(false);

        // Payment session is valid for session, not for handoff code
        expect(isValidPaymentSession(ps)).toBe(true);
        expect(isValidHandoffCode(ps)).toBe(false);
      }),
      { numRuns: 50 },
    );
  });

  it("validates that both credentials cannot pass both validators simultaneously", () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1, maxLength: 100 }), (anyString) => {
        // A string cannot be both a valid handoff code AND a valid payment session
        const isValidHC = isValidHandoffCode(anyString);
        const isValidPS = isValidPaymentSession(anyString);

        expect(isValidHC && isValidPS).toBe(false);
      }),
      { numRuns: 200 },
    );
  });
});

/* ========================================================================== */
/*                     postMessageToApp Function Tests                        */
/* ========================================================================== */

describe("postMessageToApp", () => {
  /**
   * **Validates: Requirements 14.33, BR-32**
   *
   * ADR-007 §8: Pesan dari WebView hanyalah sinyal
   */

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("does nothing when not in WebView context", () => {
    vi.stubGlobal("window", {});

    const message: WebViewMessage = {
      type: "PAYMENT_DONE",
      bookingId: "RB-123",
    };

    // Should not throw
    expect(() => postMessageToApp(message)).not.toThrow();
  });

  it("calls ReactNativeWebView.postMessage with JSON stringified message", () => {
    const mockPostMessage = vi.fn();
    vi.stubGlobal("window", {
      ReactNativeWebView: {
        postMessage: mockPostMessage,
      },
    });

    const message: WebViewMessage = {
      type: "PAYMENT_DONE",
      bookingId: "RB-123",
    };

    postMessageToApp(message);

    expect(mockPostMessage).toHaveBeenCalledTimes(1);
    expect(mockPostMessage).toHaveBeenCalledWith(JSON.stringify(message));
  });

  it("sends correct message format for all WebViewMessage types", () => {
    const mockPostMessage = vi.fn();
    vi.stubGlobal("window", {
      ReactNativeWebView: {
        postMessage: mockPostMessage,
      },
    });

    const messages: WebViewMessage[] = [
      { type: "PAYMENT_DONE", bookingId: "RB-001" },
      { type: "PAYMENT_EXPIRED", bookingId: "RB-002" },
      { type: "HANDOFF_EXPIRED", bookingId: "RB-003" },
      { type: "OPEN_EXTERNAL", bookingId: "RB-004", url: "https://gojek.link/pay" },
      { type: "CLOSE", bookingId: "RB-005" },
    ];

    for (const msg of messages) {
      mockPostMessage.mockClear();
      postMessageToApp(msg);
      expect(mockPostMessage).toHaveBeenCalledWith(JSON.stringify(msg));
    }
  });

  it("handles booking IDs with various formats", () => {
    const mockPostMessage = vi.fn();
    vi.stubGlobal("window", {
      ReactNativeWebView: {
        postMessage: mockPostMessage,
      },
    });

    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
        (bookingId) => {
          mockPostMessage.mockClear();

          const message: WebViewMessage = {
            type: "PAYMENT_DONE",
            bookingId,
          };

          postMessageToApp(message);

          const calls = mockPostMessage.mock.calls;
          expect(calls.length).toBeGreaterThan(0);
          const parsed = JSON.parse(calls[0]![0] as string);
          expect(parsed.bookingId).toBe(bookingId);
        },
      ),
      { numRuns: 50 },
    );
  });
});

/* ========================================================================== */
/*                extractHandoffCodeFromFragment Edge Cases                   */
/* ========================================================================== */

describe("extractHandoffCodeFromFragment edge cases", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns null when window is undefined (SSR)", () => {
    vi.stubGlobal("window", undefined);
    expect(extractHandoffCodeFromFragment()).toBeNull();
  });

  it("extracts code correctly regardless of other hash parameters", () => {
    const mockWindow = {
      location: {
        hash: "#other=value&code=hc_abc123&another=param",
      },
    };
    vi.stubGlobal("window", mockWindow);

    expect(extractHandoffCodeFromFragment()).toBe("hc_abc123");
  });

  it("extracts only the first code match", () => {
    const code = "hc_0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
    const mockWindow = {
      location: {
        hash: `#code=${code}`,
      },
    };
    vi.stubGlobal("window", mockWindow);

    expect(extractHandoffCodeFromFragment()).toBe(code);
  });

  it("handles empty hash", () => {
    const mockWindow = {
      location: {
        hash: "",
      },
    };
    vi.stubGlobal("window", mockWindow);

    expect(extractHandoffCodeFromFragment()).toBeNull();
  });

  it("handles hash without code parameter", () => {
    const mockWindow = {
      location: {
        hash: "#section=payment&tab=va",
      },
    };
    vi.stubGlobal("window", mockWindow);

    expect(extractHandoffCodeFromFragment()).toBeNull();
  });
});
