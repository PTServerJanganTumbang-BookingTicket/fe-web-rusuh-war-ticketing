// Mock API di sisi server (Home) saat NEXT_PUBLIC_API_MOCKING=enabled. Sisi browser: AppProviders.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.NEXT_PUBLIC_API_MOCKING === "enabled") {
    const { server } = await import("@rusuh/mocks/node");
    server.listen({ onUnhandledFrame: "bypass" });
  }
}
