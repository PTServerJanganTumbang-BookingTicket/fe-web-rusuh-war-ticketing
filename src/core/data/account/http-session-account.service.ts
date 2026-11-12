import { z } from "zod";
import type { SessionAccount } from "@/core/domain/session-account.model";
import type { SessionAccountProtocol } from "@/core/domain/session-account.protocol";
import type { HttpClient } from "../http/http.client";

/** `data` dari `GET /api/auth/session`: profil dari cookie, atau `account: null` untuk tamu. */
const sessionAccountSchema = z
  .object({
    account: z.object({ email: z.string(), nik_masked: z.string(), nik: z.string().optional() }).nullable(),
  })
  .transform(
    (session): SessionAccount | null =>
      session.account && {
        email: session.account.email,
        nikMasked: session.account.nik_masked,
        ...(session.account.nik ? { nik: session.account.nik } : {}),
      },
  );

export function createHttpSessionAccountService({
  bffHttpClient,
}: {
  bffHttpClient: HttpClient;
}): SessionAccountProtocol {
  return {
    current: () => bffHttpClient.get("/auth/session", sessionAccountSchema),
  };
}
