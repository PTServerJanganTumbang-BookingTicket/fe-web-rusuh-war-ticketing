import { getServerDependencies } from "@/di/server-dependencies";

// Menukar token magic link dengan token akun di cookie httpOnly (ADR-0023). Token tidak pernah kembali ke browser.
export function POST(request: Request) {
  return getServerDependencies().accountGateway.verify(request);
}
