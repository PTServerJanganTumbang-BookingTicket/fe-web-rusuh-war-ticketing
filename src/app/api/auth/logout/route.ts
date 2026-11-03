import { getServerDependencies } from "@/di/server-dependencies";

export function POST() {
  return getServerDependencies().accountGateway.logout();
}
