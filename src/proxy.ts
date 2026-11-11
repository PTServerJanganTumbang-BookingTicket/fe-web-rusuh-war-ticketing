import { NextResponse, type NextRequest } from "next/server";
import { ACCESS_TOKEN_COOKIE } from "@/core/data/session/access-token.constants";

// Pengganti middleware.ts di Next 16 (ADR-0007).
// SEMENTARA: hanya memeriksa keberadaan cookie. Verifikasi tanda tangan JWT di edge belum dipasang.
// Satu arah: tanpa grant, /book kembali ke Waiting Room; dengan grant, Waiting Room kembali ke /book.
// Saat grant habis, controller booking menghapus cookie lewat /api/session/end sebelum antre lagi.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasGrant = request.cookies.has(ACCESS_TOKEN_COOKIE);

  const queueMatch = /^\/events\/([^/]+)\/queue$/.exec(pathname);
  if (queueMatch) {
    return hasGrant
      ? NextResponse.redirect(new URL(`/events/${queueMatch[1]}/book`, request.url))
      : NextResponse.next();
  }

  if (hasGrant) return NextResponse.next();

  const bookMatch = /^\/events\/([^/]+)\/book$/.exec(pathname);
  const target = bookMatch ? `/events/${bookMatch[1]}/queue` : "/";
  return NextResponse.redirect(new URL(target, request.url));
}

export const config = {
  matcher: ["/events/:eventId/book", "/events/:eventId/queue", "/orders/:orderId/pay"],
};
