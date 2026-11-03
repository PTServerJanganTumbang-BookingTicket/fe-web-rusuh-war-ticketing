import { getServerDependencies } from "@/di/server-dependencies";

export function GET(request: Request) {
  return getServerDependencies().accountGateway.session(request);
}
