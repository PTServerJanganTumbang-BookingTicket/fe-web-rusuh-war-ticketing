// Alias untuk link email verifikasi dari backend: `/auth/verify-email?token=...` (diasumsikan sejajar dengan
// `/auth/login?token=`). Route ini tidak mengonfirmasi apa pun; halaman `/register/verified` yang menukar token
// lewat `POST /api/auth/verify-email`, jadi pemindai email yang hanya membuka link tidak menghanguskan token di sini.
export function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  const path = token ? `/register/verified?token=${encodeURIComponent(token)}` : "/register/verified";
  return new Response(null, {
    status: 303,
    headers: {
      location: new URL(path, request.url).toString(),
      // Token ada di URL: jangan di-cache dan jangan bocor lewat Referer ke halaman berikutnya.
      "cache-control": "no-store",
      "referrer-policy": "no-referrer",
    },
  });
}
