import { describe, expect, it } from "vitest";
import { AppFailure } from "@/core/domain/app-error";
import { pollingStopped, QUERY_MAX_RETRIES, shouldRetryQuery } from "../query-retry.utils";

describe("shouldRetryQuery", () => {
  it("retries network and 5xx failures up to the limit", () => {
    const err = new AppFailure({ kind: "unknown", status: 500 });
    expect(shouldRetryQuery(0, err)).toBe(true);
    expect(shouldRetryQuery(QUERY_MAX_RETRIES - 1, err)).toBe(true);
    expect(shouldRetryQuery(QUERY_MAX_RETRIES, err)).toBe(false);
    expect(shouldRetryQuery(0, new AppFailure({ kind: "network" }))).toBe(true);
  });

  it("does not retry contract errors or invalid responses", () => {
    expect(shouldRetryQuery(0, new AppFailure({ kind: "api", code: "SALE_CLOSED", status: 409 }))).toBe(
      false,
    );
    expect(shouldRetryQuery(0, new AppFailure({ kind: "invalid_response" }))).toBe(false);
  });
});

describe("pollingStopped", () => {
  it("stops only in error status", () => {
    expect(pollingStopped({ state: { status: "error" } })).toBe(true);
    expect(pollingStopped({ state: { status: "success" } })).toBe(false);
  });
});
