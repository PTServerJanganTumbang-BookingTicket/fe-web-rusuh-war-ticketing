import { describe, expect, it } from "vitest";
import { emailLinkSentResponse, meResponse } from "../../contracts/auth";
import {
  toAccount,
  toEmailLinkSent,
  toLoginLinkRequest,
  toRedeemLoginLinkRequest,
  toRegisterRequest,
  toVerificationEmailRequest,
  toVerifyEmailRequest,
} from "../auth";

describe("respons auth", () => {
  it("akun dari /me: NIK tetap tersamar", () => {
    const dto = meResponse.parse({ email: "alex@example.com", maskedNik: "3171••••••••0001", emailVerified: true });
    expect(toAccount(dto)).toEqual({ email: "alex@example.com", maskedNik: "3171••••••••0001", emailVerified: true });
  });

  it("email terkirim membawa jeda kirim ulang dan jam server", () => {
    const dto = emailLinkSentResponse.parse({ email: "a@b.co", resendAvailableAt: "2026-10-23T10:00:30.000Z", serverNow: "2026-10-23T10:00:00.000Z" });
    expect(toEmailLinkSent(dto)).toEqual({ email: "a@b.co", resendAvailableAt: "2026-10-23T10:00:30.000Z", serverNow: "2026-10-23T10:00:00.000Z" });
  });

  it("menolak /me tanpa status verifikasi", () => {
    expect(meResponse.safeParse({ email: "a@b.co", maskedNik: "x" }).success).toBe(false);
  });
});

describe("request body auth", () => {
  it("dibentuk mapper; NIK tetap string dengan nol di depan", () => {
    expect(toLoginLinkRequest("a@b.co", "/events/evt-1/queue")).toEqual({ email: "a@b.co", returnTo: "/events/evt-1/queue" });
    expect(toRedeemLoginLinkRequest("tok")).toEqual({ token: "tok" });
    expect(toRegisterRequest("a@b.co", "0012345678901234")).toEqual({ email: "a@b.co", nik: "0012345678901234" });
    expect(toVerificationEmailRequest("a@b.co")).toEqual({ email: "a@b.co" });
    expect(toVerifyEmailRequest("tok")).toEqual({ token: "tok" });
  });
});
