import { getServerDependencies } from "@/di/server-dependencies";

// Link login dari email backend: `/auth/login?token=...`. Token ditukar di server lewat cookie `magic_token`
// ke BE (kontrak `GET /auth/verify`), cookie akun disetel, lalu customer langsung dialihkan ke beranda.
export function GET(request: Request) {
  return getServerDependencies().accountGateway.verifyLink(request);
}
