import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { ACCESS_EVENT_COOKIE, ACCESS_TOKEN_COOKIE } from "@/core/data/session/access-token.constants";
import { config, proxy } from "../../../proxy";

/** `grantFor`: event pemilik grant di cookie; `null` berarti cookie grant lama tanpa catatan event. */
const request = (path: string, grantFor?: string | null) => {
  const cookies = [
    ...(grantFor === undefined ? [] : [`${ACCESS_TOKEN_COOKIE}=tok`]),
    ...(grantFor ? [`${ACCESS_EVENT_COOKIE}=${grantFor}`] : []),
  ];
  return new NextRequest(`http://localhost:3000${path}`, {
    headers: cookies.length > 0 ? { cookie: cookies.join("; ") } : {},
  });
};

const passed = (response: Response) =>
  response.headers.get("x-middleware-next") === "1" && response.headers.get("location") === null;

const redirectedTo = (response: Response) => {
  expect(response.status).toBe(307);
  return new URL(response.headers.get("location") ?? "").pathname;
};

describe("proxy", () => {
  it("grant event ini: /book diteruskan", () => {
    expect(passed(proxy(request("/events/evt_1/book", "evt_1")))).toBe(true);
  });

  it("tanpa cookie, /book diarahkan ke Waiting Room event itu", () => {
    expect(redirectedTo(proxy(request("/events/evt_1/book")))).toBe("/events/evt_1/queue");
  });

  it("grant event lain: /book diarahkan ke Waiting Room event itu, bukan dilewatkan", () => {
    expect(redirectedTo(proxy(request("/events/evt_2/book", "evt_1")))).toBe("/events/evt_2/queue");
  });

  it("grant event lain: Waiting Room dilayani, tidak dipantulkan ke /book", () => {
    expect(passed(proxy(request("/events/evt_2/queue", "evt_1")))).toBe(true);
  });

  it("cookie grant lama tanpa catatan event tidak membuka /book dan tidak memantulkan Waiting Room", () => {
    expect(redirectedTo(proxy(request("/events/evt_1/book", null)))).toBe("/events/evt_1/queue");
    expect(passed(proxy(request("/events/evt_1/queue", null)))).toBe(true);
  });

  it("catatan event tanpa cookie grant tidak dianggap grant", () => {
    const stray = new NextRequest("http://localhost:3000/events/evt_1/queue", {
      headers: { cookie: `${ACCESS_EVENT_COOKIE}=evt_1` },
    });
    expect(passed(proxy(stray))).toBe(true);
  });

  it("grant event ini: Waiting Room diarahkan kembali ke /book event itu", () => {
    expect(redirectedTo(proxy(request("/events/evt_1/queue", "evt_1")))).toBe("/events/evt_1/book");
  });

  it("tanpa cookie, Waiting Room diteruskan", () => {
    expect(passed(proxy(request("/events/evt_1/queue")))).toBe(true);
  });

  it("id event ter-encode di URL dicocokkan dengan nilai cookie yang sudah di-decode", () => {
    const encoded = new NextRequest("http://localhost:3000/events/evt%201/book", {
      headers: { cookie: `${ACCESS_TOKEN_COOKIE}=tok; ${ACCESS_EVENT_COOKIE}=evt%201` },
    });
    expect(passed(proxy(encoded))).toBe(true);
  });

  it("segmen event yang rusak tidak cocok dengan grant mana pun", () => {
    expect(redirectedTo(proxy(request("/events/%E0%A4%A/book", "evt_1")))).toBe("/events/%E0%A4%A/queue");
  });

  it("/pay: grant event mana pun diteruskan; tanpa cookie diarahkan ke Home", () => {
    expect(passed(proxy(request("/orders/RB-1/pay", "evt_1")))).toBe(true);
    expect(passed(proxy(request("/orders/RB-1/pay", null)))).toBe(true);
    expect(redirectedTo(proxy(request("/orders/RB-1/pay")))).toBe("/");
  });

  it("matcher hanya halaman booking, Waiting Room, dan pembayaran", () => {
    expect(config.matcher).toEqual([
      "/events/:eventId/book",
      "/events/:eventId/queue",
      "/orders/:orderId/pay",
    ]);
  });
});
