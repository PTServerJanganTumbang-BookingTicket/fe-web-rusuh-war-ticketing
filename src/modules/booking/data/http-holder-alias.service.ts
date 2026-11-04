import type { HttpClient } from "@/core/data/http/http.client";
import type { HolderAlias } from "../domain/holder-alias.model";
import type { HolderAliasProtocol } from "../domain/holder-alias.protocol";
import { holderAliasListSchema } from "./holder-alias.schema";

/** Alias lewat route same-origin yang menambahkan Bearer dari cookie akun (ADR-0023). */
export function createHttpHolderAliasService({
  bffHttpClient,
}: {
  bffHttpClient: HttpClient;
}): HolderAliasProtocol {
  return {
    list(): Promise<HolderAlias[]> {
      return bffHttpClient.get("/account/saved-niks", holderAliasListSchema, {
        errorCodes: { 401: "UNAUTHENTICATED" },
      });
    },
  };
}
