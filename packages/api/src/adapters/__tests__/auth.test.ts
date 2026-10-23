import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { MOCK_API_BASE_URL } from "@rusuh/mocks/handlers";
import { failureOf, setupApiServer } from "../../__tests__/support";
import { emulateLastEmailLink, endSession, getMe, redeemLoginLink, registerAccount, sendLoginLink, sendVerificationEmail, verifyEmail } from "../auth";

const server = setupApiServer();

// Satu server MSW dipakai bersama, jadi urutan test di file ini membentuk satu alur sesi.
describe("auth", () => {
  it("me: akun dengan NIK tersamar saat sesi aktif", async () => {
    expect(await getMe()).toEqual({ email: "alex@example.com", maskedNik: "3171••••••••0001", emailVerified: true });
  });

  it("logout lalu me: UNAUTHENTICATED", async () => {
    await endSession();
    expect(await failureOf(getMe())).toEqual({ kind: "api", code: "UNAUTHENTICATED", status: 401 });
  });

  it("kirim link, lalu kirim ulang terlalu cepat: RATE_LIMITED dengan retryAfterMs", async () => {
    const sent = await sendLoginLink("auth-a@example.com", "/");
    expect(sent.email).toBe("auth-a@example.com");
    expect(Date.parse(sent.resendAvailableAt)).toBeGreaterThan(Date.parse(sent.serverNow));

    const error = await failureOf(sendLoginLink("auth-a@example.com", "/"));
    expect(error).toMatchObject({ kind: "api", code: "RATE_LIMITED", status: 429 });
    expect(error.kind === "api" && error.retryAfterMs).toBeGreaterThan(0);
  });

  it("link sekali pakai: berhasil sekali, kedua kalinya LOGIN_LINK_INVALID", async () => {
    await sendLoginLink("auth-b@example.com", "/");
    const token = await emulateLastEmailLink("login");
    await redeemLoginLink(token);
    expect((await getMe()).email).toBe("alex@example.com");
    expect(await failureOf(redeemLoginLink(token))).toEqual({ kind: "api", code: "LOGIN_LINK_INVALID", status: 410 });
  });

  it("registrasi: email terdaftar, NIK tidak cocok, dan Dukcapil tidak tersedia dipetakan ke error code", async () => {
    expect(await failureOf(registerAccount("alex@example.com", "3171000000000001"))).toMatchObject({ code: "EMAIL_ALREADY_REGISTERED", status: 409 });
    expect(await failureOf(registerAccount("reg-a@example.com", "3171000000009999"))).toMatchObject({ code: "NIK_MISMATCH" });
    expect(await failureOf(registerAccount("reg-a@example.com", "3171000000000000"))).toMatchObject({ code: "NIK_VERIFICATION_UNAVAILABLE", status: 503 });
  });

  it("registrasi berhasil, kirim ulang terlalu cepat dibatasi, link verifikasi sekali pakai", async () => {
    const sent = await registerAccount("reg-b@example.com", "3171000000000001");
    expect(sent.email).toBe("reg-b@example.com");
    expect(await failureOf(sendVerificationEmail("reg-b@example.com"))).toMatchObject({ code: "RATE_LIMITED" });

    const token = await emulateLastEmailLink("verification");
    await verifyEmail(token);
    expect(await failureOf(verifyEmail(token))).toEqual({ kind: "api", code: "VERIFICATION_LINK_INVALID", status: 410 });
    expect(await failureOf(registerAccount("reg-b@example.com", "3171000000000001"))).toMatchObject({ code: "EMAIL_ALREADY_REGISTERED" });
  });

  it("sesi dicabut: SESSION_REVOKED", async () => {
    server.use(http.get(`${MOCK_API_BASE_URL}/me`, () => HttpResponse.json({ code: "SESSION_REVOKED" }, { status: 401 })));
    expect(await failureOf(getMe())).toEqual({ kind: "api", code: "SESSION_REVOKED", status: 401 });
  });
});
