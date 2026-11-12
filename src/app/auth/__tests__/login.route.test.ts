import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { GET } from "../login/route";

const call = (search: string) => GET(new NextRequest(`https://www.example.test/auth/login${search}`));

describe("GET /auth/login", () => {
  it("memindahkan token dari query ke fragmen /login/verify", () => {
    const response = call("?token=abc-DEF_123");
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("https://www.example.test/login/verify#token=abc-DEF_123");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
  });

  it("meng-encode token yang berisi karakter khusus", () => {
    const response = call(`?token=${encodeURIComponent("a&b=c")}`);
    expect(response.headers.get("location")).toBe("https://www.example.test/login/verify#token=a%26b%3Dc");
  });

  it("tanpa token tetap ke layar verifikasi, yang menampilkan link tidak valid", () => {
    expect(call("").headers.get("location")).toBe("https://www.example.test/login/verify");
  });
});
