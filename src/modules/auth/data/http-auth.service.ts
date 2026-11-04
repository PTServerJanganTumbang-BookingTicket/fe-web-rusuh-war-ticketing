import { z } from "zod";
import type { HttpClient } from "@/core/data/http/http.client";
import type { AuthProtocol } from "../domain/auth.protocol";
import type { Account, EventSummary, LoginResult, RegisterInput } from "../domain/account.model";
import { eventSummarySchema, loginResultSchema, sessionSchema } from "./account.schema";

/**
 * Endpoint anonim (minta link, kirim ulang, register) dipanggil langsung ke BE. Verifikasi, sesi, dan keluar
 * lewat route same-origin, karena token akun hanya boleh hidup di cookie httpOnly (ADR-0023).
 */
export function createHttpAuthService({
  httpClient,
  bffHttpClient,
}: {
  httpClient: HttpClient;
  bffHttpClient: HttpClient;
}): AuthProtocol {
  const rateLimited = { 429: "RATE_LIMITED" } as const;

  return {
    async requestMagicLink(email: string): Promise<void> {
      await httpClient.post("/auth/magic-link", { email }, z.unknown(), { errorCodes: rateLimited });
    },

    async resendMagicLink(email: string): Promise<void> {
      await httpClient.post("/auth/magic-link/resend", { email }, z.unknown(), { errorCodes: rateLimited });
    },

    // Kontrak belum punya endpoint kirim ulang verifikasi pendaftaran; sementara memakai kirim ulang link
    // (`/auth/magic-link/resend`) sampai disepakati BE (ADR-0023, usulan perubahan kontrak).
    async resendVerification(email: string): Promise<void> {
      await httpClient.post("/auth/magic-link/resend", { email }, z.unknown(), { errorCodes: rateLimited });
    },

    async register(input: RegisterInput): Promise<void> {
      await httpClient.post(
        "/auth/register",
        {
          email: input.email,
          nik: input.nik,
          name: input.name,
          consent: { accepted: true, policy_version: input.policyVersion },
        },
        z.unknown(),
        {
          errorCodes: {
            400: "NIK_INVALID",
            409: "NIK_ALREADY_REGISTERED",
            422: "CONSENT_REQUIRED",
            429: "RATE_LIMITED",
          },
        },
      );
    },

    verify(token: string): Promise<LoginResult> {
      return bffHttpClient.post("/auth/verify", { token }, loginResultSchema, {
        errorCodes: { 400: "LOGIN_LINK_INVALID", 401: "LOGIN_LINK_INVALID" },
      });
    },

    getAccount(): Promise<Account | null> {
      return bffHttpClient.get("/auth/session", sessionSchema);
    },

    async signOut(): Promise<void> {
      await bffHttpClient.post("/auth/logout", {}, z.unknown());
    },

    getEventSummary(eventId: string): Promise<EventSummary> {
      return httpClient.get(`/events/${encodeURIComponent(eventId)}`, eventSummarySchema);
    },
  };
}
