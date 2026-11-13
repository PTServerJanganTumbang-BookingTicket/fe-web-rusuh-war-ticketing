import { cookies } from "next/headers";
import {
  ACCESS_EVENT_COOKIE,
  ACCESS_TOKEN_COOKIE,
  ACCESS_TOKEN_MAX_AGE_SECONDS,
} from "@/core/data/session/access-token.constants";

function textField(body: unknown, name: string): string | undefined {
  if (typeof body !== "object" || body === null || !(name in body)) return undefined;
  const value = (body as Record<string, unknown>)[name];
  return typeof value === "string" && value !== "" ? value : undefined;
}

// Waiting Room web: menyimpan access token dari antrian ke cookie httpOnly supaya tidak pernah ada di URL, bersama
// event pemiliknya: gerbang `proxy.ts` hanya membuka halaman booking event itu.
// Penukaran one-time code WebView (ADR-0008) adalah route terpisah: /api/session/exchange (belum dibuat).
export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const accessToken = textField(body, "accessToken");
  const eventId = textField(body, "eventId");

  if (!accessToken || !eventId) {
    return Response.json({ code: "QUEUE_TOKEN_INVALID" }, { status: 400 });
  }

  const options = {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ACCESS_TOKEN_MAX_AGE_SECONDS,
  } as const;
  const store = await cookies();
  store.set(ACCESS_TOKEN_COOKIE, accessToken, options);
  store.set(ACCESS_EVENT_COOKIE, eventId, options);
  return new Response(null, { status: 204 });
}
