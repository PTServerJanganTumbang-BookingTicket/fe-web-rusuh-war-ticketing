import { cookies } from "next/headers";
import { ACCESS_TOKEN_COOKIE, ACCESS_TOKEN_MAX_AGE_SECONDS, parseStartSessionBody } from "@/features/shared/session";

// Waiting Room web: menyimpan access token dari antrian ke cookie httpOnly supaya tidak pernah ada di URL.
// Penukaran one-time code WebView (ADR-0008) adalah route terpisah: /api/session/exchange (belum dibuat).
export async function POST(request: Request) {
  const accessToken = parseStartSessionBody(await request.json().catch(() => null));

  if (!accessToken) {
    return Response.json({ code: "QUEUE_TOKEN_INVALID" }, { status: 400 });
  }

  (await cookies()).set(ACCESS_TOKEN_COOKIE, accessToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ACCESS_TOKEN_MAX_AGE_SECONDS,
  });
  return new Response(null, { status: 204 });
}
