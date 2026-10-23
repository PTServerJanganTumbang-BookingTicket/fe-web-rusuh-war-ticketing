import { describe, expect, it } from "vitest";
import { deriveAuthCallbackScreenState } from "../authCallbackModel";

describe("deriveAuthCallbackScreenState", () => {
  it("tanpa galat: redeeming, termasuk setelah berhasil sampai navigasi selesai", () => {
    expect(deriveAuthCallbackScreenState(undefined)).toEqual({ kind: "redeeming" });
  });

  it("galat: failed membawa AppError", () => {
    const error = { kind: "api", code: "LOGIN_LINK_INVALID", status: 410 } as const;
    expect(deriveAuthCallbackScreenState(error)).toEqual({ kind: "failed", error });
  });
});
