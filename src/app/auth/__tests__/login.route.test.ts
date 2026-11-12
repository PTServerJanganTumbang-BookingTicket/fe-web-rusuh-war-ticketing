import { describe, expect, it, vi } from "vitest";

const gateway = { verifyLink: vi.fn(() => new Response(null, { status: 303 })) };
vi.mock("@/di/server-dependencies", () => ({ getServerDependencies: () => ({ accountGateway: gateway }) }));

describe("GET /auth/login", () => {
  it("menyerahkan link email ke gateway", async () => {
    const { GET } = await import("../login/route");
    const request = new Request("http://localhost:3000/auth/login?token=abc");
    const response = GET(request);
    expect(gateway.verifyLink).toHaveBeenCalledWith(request);
    expect((await response).status).toBe(303);
  });
});
