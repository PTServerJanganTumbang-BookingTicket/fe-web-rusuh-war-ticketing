import { describe, expect, it } from "vitest";
import { ACCESS_TOKEN_COOKIE, ACCESS_TOKEN_MAX_AGE_SECONDS, parseStartSessionBody } from "../session";

describe("parseStartSessionBody", () => {
  it("mengembalikan accessToken yang valid", () => {
    expect(parseStartSessionBody({ accessToken: "tok-1" })).toBe("tok-1");
  });

  it.each([null, undefined, "tok-1", 42, [], {}, { accessToken: "" }, { accessToken: 7 }, { token: "tok-1" }])("menolak %j", (body) => {
    expect(parseStartSessionBody(body)).toBeNull();
  });
});

describe("kontrak cookie sesi", () => {
  it("nama dan umur cookie tidak berubah diam-diam (dipakai e2e dan proxy)", () => {
    expect(ACCESS_TOKEN_COOKIE).toBe("access_token");
    expect(ACCESS_TOKEN_MAX_AGE_SECONDS).toBe(600);
  });
});
