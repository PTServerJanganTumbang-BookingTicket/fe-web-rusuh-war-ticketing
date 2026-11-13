import { NextResponse, type NextRequest } from "next/server";
import { ACCESS_EVENT_COOKIE, ACCESS_TOKEN_COOKIE } from "@/core/data/session/access-token.constants";

/** Segmen path bisa ter-encode; nilai cookie sudah di-decode Next. Segmen yang rusak tidak cocok dengan event mana pun. */
function eventIdOf(segment: string | undefined): string | undefined {
  try {
    return segment === undefined ? undefined : decodeURIComponent(segment);
  } catch {
    return undefined;
  }
}

// Pengganti middleware.ts di Next 16 (ADR-0007).
// SEMENTARA: hanya memeriksa keberadaan cookie. Verifikasi tanda tangan JWT di edge belum dipasang.
// Grant terikat ke satu event (FR-06): hanya grant event itu yang membuka /book dan memantulkan Waiting Room ke
// /book. Grant event lain, atau tanpa grant, /book kembali ke Waiting Room event itu dan Waiting Room dilayani biasa.
// Saat grant habis, controller booking menghapus cookie lewat /api/session/end sebelum antre lagi.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasGrant = request.cookies.has(ACCESS_TOKEN_COOKIE);
  const grantEventId = hasGrant ? request.cookies.get(ACCESS_EVENT_COOKIE)?.value : undefined;

  const eventMatch = /^\/events\/([^/]+)\/(queue|book)$/.exec(pathname);
  if (!eventMatch) {
    // /orders/:orderId/pay: grant event mana pun; order tidak membawa event di URL.
    return hasGrant ? NextResponse.next() : NextResponse.redirect(new URL("/", request.url));
  }

  const [, segment, page] = eventMatch;
  const holdsGrant = grantEventId !== undefined && grantEventId === eventIdOf(segment);
  const allowed = page === "book" ? holdsGrant : !holdsGrant;
  if (allowed) return NextResponse.next();
  const target = page === "book" ? "queue" : "book";
  return NextResponse.redirect(new URL(`/events/${segment}/${target}`, request.url));
}

export const config = {
  matcher: ["/events/:eventId/book", "/events/:eventId/queue", "/orders/:orderId/pay"],
};
