import { getServerDependencies } from "@/di/server-dependencies";

// Konfirmasi email pendaftaran. Token tautan dikirim ke BE sebagai cookie dari server ini, bukan dari browser.
export function POST(request: Request) {
  return getServerDependencies().accountGateway.verifyEmail(request);
}
