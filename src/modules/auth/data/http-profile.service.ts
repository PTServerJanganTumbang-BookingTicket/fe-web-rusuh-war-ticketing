import type { HttpClient } from "@/core/data/http/http.client";
import type { Profile } from "../domain/account.model";
import type { ProfileProtocol } from "../domain/profile.protocol";
import { profileSchema } from "./account.schema";

/** `/accounts/me` lewat route same-origin yang menambahkan `Authorization: Bearer` dari cookie (ADR-0023). */
export function createHttpProfileService({ bffHttpClient }: { bffHttpClient: HttpClient }): ProfileProtocol {
  return {
    get(): Promise<Profile> {
      return bffHttpClient.get("/account/profile", profileSchema, { errorCodes: { 401: "UNAUTHENTICATED" } });
    },
  };
}
