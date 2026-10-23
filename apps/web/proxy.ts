import { NextResponse, type NextRequest } from "next/server";
import { ACCESS_TOKEN_COOKIE } from "@/features/shared/session";

// Pengganti middleware.ts di Next 16 (ADR-0007).
// SEMENTARA: hanya memeriksa keberadaan cookie. Verifikasi tanda tangan JWT di edge belum dipasang.
export function proxy(request: NextRequest) {
  if (request.cookies.has(ACCESS_TOKEN_COOKIE)) return NextResponse.next();

  const queueMatch = /^\/events\/([^/]+)\/book$/.exec(request.nextUrl.pathname);
  const target = queueMatch ? `/events/${queueMatch[1]}/queue` : "/";
  return NextResponse.redirect(new URL(target, request.url));
}

export const config = {
  matcher: ["/events/:eventId/book", "/orders/:orderId/pay"],
};
