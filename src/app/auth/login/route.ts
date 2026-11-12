import { NextResponse, type NextRequest } from "next/server";

// Link login dari email backend berbentuk `/auth/login?token=...`. Layar konfirmasi FE ada di `/login/verify` dan
// membaca token dari fragmen URL (ADR-0023). Route ini memindahkan token dari query ke fragmen supaya link lama
// tetap bekerja. Token hanya dibaca untuk dipindah: tidak dicatat dan tidak dikirim ke backend.
export function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const target = new URL("/login/verify", request.url);
  if (token) target.hash = new URLSearchParams({ token }).toString();
  return NextResponse.redirect(target, {
    status: 303,
    // Jangan di-cache dan jangan bocor lewat Referer ke halaman berikutnya.
    headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" },
  });
}
