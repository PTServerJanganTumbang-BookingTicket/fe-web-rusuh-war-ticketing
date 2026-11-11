import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { ACCESS_TOKEN_COOKIE } from "@/core/data/session/access-token.constants";
import { config, proxy } from "../../../proxy";

const request = (path: string, withCookie: boolean) =>
  new NextRequest(`http://localhost:3000${path}`, {
    headers: withCookie ? { cookie: `${ACCESS_TOKEN_COOKIE}=tok` } : {},
  });

describe("proxy", () => {
  it("meneruskan permintaan yang membawa cookie akses", () => {
    const response = proxy(request("/events/evt_1/book", true));
    expect(response.headers.get("x-middleware-next")).toBe("1");
    expect(response.headers.get("location")).toBeNull();
  });

  it("tanpa cookie, /book diarahkan ke Waiting Room event itu", () => {
    const response = proxy(request("/events/evt_1/book", false));
    expect(response.status).toBe(307);
    expect(new URL(response.headers.get("location") ?? "").pathname).toBe("/events/evt_1/queue");
  });

  it("tanpa cookie, /pay diarahkan ke Home", () => {
    const response = proxy(request("/orders/RB-1/pay", false));
    expect(response.status).toBe(307);
    expect(new URL(response.headers.get("location") ?? "").pathname).toBe("/");
  });

  it("dengan cookie, Waiting Room diarahkan kembali ke /book event itu", () => {
    const response = proxy(request("/events/evt_1/queue", true));
    expect(response.status).toBe(307);
    expect(new URL(response.headers.get("location") ?? "").pathname).toBe("/events/evt_1/book");
  });

  it("tanpa cookie, Waiting Room diteruskan", () => {
    const response = proxy(request("/events/evt_1/queue", false));
    expect(response.headers.get("x-middleware-next")).toBe("1");
    expect(response.headers.get("location")).toBeNull();
  });

  it("matcher hanya halaman booking, Waiting Room, dan pembayaran", () => {
    expect(config.matcher).toEqual([
      "/events/:eventId/book",
      "/events/:eventId/queue",
      "/orders/:orderId/pay",
    ]);
  });
});
