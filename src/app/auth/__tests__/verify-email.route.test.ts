import { describe, expect, it } from "vitest";
import { GET } from "../verify-email/route";

const call = (search: string) => GET(new Request(`http://localhost:3000/auth/verify-email${search}`));

describe("GET /auth/verify-email", () => {
  it("mengalihkan link email ke halaman terverifikasi dengan token yang sama", () => {
    const response = call("?token=abc");
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("http://localhost:3000/register/verified?token=abc");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
  });

  it("tanpa token: ke halaman terverifikasi tanpa query", () => {
    const response = call("");
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("http://localhost:3000/register/verified");
  });

  it("token yang perlu di-encode tidak merusak query", () => {
    const response = call(`?token=${encodeURIComponent("a b&c=d")}`);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/register/verified?token=a%20b%26c%3Dd",
    );
  });
});
