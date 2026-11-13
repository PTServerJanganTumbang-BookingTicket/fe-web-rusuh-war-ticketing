import { cookies } from "next/headers";
import { ACCESS_EVENT_COOKIE, ACCESS_TOKEN_COOKIE } from "@/core/data/session/access-token.constants";

// Kebalikan /api/session/start: grant habis atau dilepas, cookie dihapus supaya gerbang `proxy.ts` mengizinkan
// customer kembali ke Waiting Room. Bila body menyebut `accessToken`, hanya cookie yang masih berisi grant itu yang
// dihapus: permintaan yang terlambat tiba (atau dari tab lain) tidak menghapus grant yang lebih baru.
export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const ending =
    typeof body === "object" && body !== null && "accessToken" in body ? body.accessToken : undefined;
  const store = await cookies();
  const current = store.get(ACCESS_TOKEN_COOKIE)?.value;

  if (typeof ending !== "string" || current === undefined || current === ending) {
    store.delete(ACCESS_TOKEN_COOKIE);
    store.delete(ACCESS_EVENT_COOKIE);
  }
  return new Response(null, { status: 204 });
}
