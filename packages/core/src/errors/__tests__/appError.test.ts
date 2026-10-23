import { describe, expect, it } from "vitest";
import { AppFailure, isAccessExpired, toAppError, type AppError } from "../appError";

describe("isAccessExpired", () => {
  it("hanya benar untuk ACCESS_EXPIRED dari server", () => {
    expect(isAccessExpired({ kind: "api", code: "ACCESS_EXPIRED", status: 410 })).toBe(true);
    const others: AppError[] = [
      { kind: "api", code: "PAYMENT_EXPIRED", status: 409 },
      { kind: "api", code: "QUEUE_TOKEN_INVALID", status: 401 },
      { kind: "network" },
      { kind: "invalid_response" },
      { kind: "unknown", status: 500 },
    ];
    for (const error of others) expect(isAccessExpired(error)).toBe(false);
  });

  it("bekerja dengan hasil toAppError", () => {
    const thrown = new AppFailure({ kind: "api", code: "ACCESS_EXPIRED", status: 410 });
    expect(isAccessExpired(toAppError(thrown))).toBe(true);
    expect(isAccessExpired(toAppError(new Error("x")))).toBe(false);
  });
});
