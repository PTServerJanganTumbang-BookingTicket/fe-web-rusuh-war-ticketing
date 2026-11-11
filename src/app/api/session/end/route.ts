import { cookies } from "next/headers";
import { ACCESS_TOKEN_COOKIE } from "@/core/data/session/access-token.constants";

// Kebalikan /api/session/start: grant habis atau dilepas, cookie dihapus supaya gerbang `proxy.ts` mengizinkan
// customer kembali ke Waiting Room.
export async function POST() {
  (await cookies()).delete(ACCESS_TOKEN_COOKIE);
  return new Response(null, { status: 204 });
}
