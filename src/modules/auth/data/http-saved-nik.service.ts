import { z } from "zod";
import type { HttpClient, RequestOptions } from "@/core/data/http/http.client";
import type { SavedNikProtocol } from "../domain/saved-nik.protocol";
import type { SavedNikList } from "../domain/account.model";
import { savedNikListSchema } from "./account.schema";

/** `/accounts/me/saved-niks` lewat route same-origin, yang menambahkan `Authorization: Bearer` dari cookie. */
export function createHttpSavedNikService({
  bffHttpClient,
}: {
  bffHttpClient: HttpClient;
}): SavedNikProtocol {
  const options: RequestOptions = { errorCodes: { 401: "UNAUTHENTICATED" } };

  return {
    list(): Promise<SavedNikList> {
      return bffHttpClient.get("/account/saved-niks", savedNikListSchema, options);
    },

    async add(nik: string, label: string): Promise<void> {
      // 400: NIK tidak ditemukan atau nonaktif di Dukcapil. 409: sudah tersimpan atau daftar penuh.
      await bffHttpClient.post("/account/saved-niks", { nik, label }, z.unknown(), {
        errorCodes: { 400: "NIK_INVALID", 401: "UNAUTHENTICATED", 409: "SAVED_NIK_REJECTED" },
      });
    },

    remove(id: string): Promise<void> {
      return bffHttpClient.delete(`/account/saved-niks/${encodeURIComponent(id)}`, options);
    },
  };
}
