import { describe, expect, it } from "vitest";
import { loginRedirectPath, parseLoginReason } from "../authRedirect";

const at = (pathname: string, search = "") => ({ pathname, search });

describe("loginRedirectPath", () => {
  it("UNAUTHENTICATED: ke login dengan alasan required dan halaman asal", () => {
    expect(loginRedirectPath({ kind: "api", code: "UNAUTHENTICATED", status: 401 }, at("/events/evt-1/queue", "?scenario=x"))).toBe(
      "/login?reason=required&returnTo=%2Fevents%2Fevt-1%2Fqueue%3Fscenario%3Dx",
    );
  });

  it("SESSION_REVOKED: alasan revoked", () => {
    expect(loginRedirectPath({ kind: "api", code: "SESSION_REVOKED", status: 401 }, at("/orders/RB-1/pay"))).toBe(
      "/login?reason=revoked&returnTo=%2Forders%2FRB-1%2Fpay",
    );
  });

  it("error lain atau sudah di halaman auth: tidak dialihkan", () => {
    expect(loginRedirectPath({ kind: "network" }, at("/events/evt-1/queue"))).toBeUndefined();
    expect(loginRedirectPath({ kind: "api", code: "ACCESS_EXPIRED", status: 410 }, at("/events/evt-1/book"))).toBeUndefined();
    expect(loginRedirectPath({ kind: "api", code: "UNAUTHENTICATED", status: 401 }, at("/login"))).toBeUndefined();
    expect(loginRedirectPath({ kind: "api", code: "UNAUTHENTICATED", status: 401 }, at("/auth/callback"))).toBeUndefined();
  });
});

describe("parseLoginReason", () => {
  it("hanya nilai yang dikenal", () => {
    expect(parseLoginReason("revoked")).toBe("revoked");
    expect(parseLoginReason("required")).toBe("required");
    expect(parseLoginReason("hack")).toBeUndefined();
    expect(parseLoginReason(null)).toBeUndefined();
  });
});
