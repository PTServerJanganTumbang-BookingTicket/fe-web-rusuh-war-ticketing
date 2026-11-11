import { getServerDependencies } from "@/di/server-dependencies";

// Endpoint auth anonim diteruskan dari server: BE menolak permintaan ini bila datang dari browser di origin lain.
export function POST(request: Request) {
  return getServerDependencies().accountGateway.forwardAuth(request, "magic-link/resend");
}
