import { getServerDependencies } from "@/di/server-dependencies";

type Context = { params: Promise<{ path: string[] }> };

// Endpoint akun diteruskan ke BE dengan token dari cookie httpOnly (ADR-0023). Daftar izin ada di gateway.
async function forward(request: Request, { params }: Context) {
  const { path } = await params;
  return getServerDependencies().accountGateway.forward(request, path.join("/"));
}

export { forward as GET, forward as POST, forward as PATCH, forward as DELETE };
