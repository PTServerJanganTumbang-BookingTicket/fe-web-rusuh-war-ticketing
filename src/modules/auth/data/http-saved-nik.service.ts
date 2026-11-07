import { z } from "zod";
import type { HttpClient, RequestOptions } from "@/core/data/http/http.client";
import type { SavedNikProtocol } from "../domain/saved-nik.protocol";
import type { SavedNikInput, SavedNikList } from "../domain/account.model";
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

    async add({ nik, label, name }: SavedNikInput): Promise<void> {
      // 400: NIK tidak ditemukan atau nonaktif di Dukcapil. 409: sudah tersimpan atau daftar penuh.
      // `name` asumsi FE (docs/api/contract-assumptions.md); BE yang belum mengenalnya mengabaikannya.
      await bffHttpClient.post("/account/saved-niks", { nik, label, name }, z.unknown(), {
        errorCodes: { 400: "NIK_INVALID", 401: "UNAUTHENTICATED", 409: "SAVED_NIK_REJECTED" },
      });
    },

    async update(id: string, input: SavedNikInput): Promise<void> {
      // NIK hanya dikirim bila diganti, supaya NIK lama tidak perlu ada di klien.
      const fields = { label: input.label, name: input.name };
      const body = input.nik ? { ...fields, nik: input.nik } : fields;
      await bffHttpClient.patch(`/account/saved-niks/${encodeURIComponent(id)}`, body, z.unknown(), {
        errorCodes: { 400: "NIK_INVALID", 401: "UNAUTHENTICATED", 409: "SAVED_NIK_REJECTED" },
      });
    },

    remove(id: string): Promise<void> {
      return bffHttpClient.delete(`/account/saved-niks/${encodeURIComponent(id)}`, options);
    },
  };
}
