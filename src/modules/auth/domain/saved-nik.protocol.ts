import type { SavedNikInput, SavedNikList } from "./account.model";

/** Daftar alias (saved NIK) milik akun (maksimal dari server, saat ini 5). Hanya untuk customer yang masuk. */
export interface SavedNikProtocol {
  list(): Promise<SavedNikList>;
  add(input: SavedNikInput): Promise<void>;
  /** `PATCH /accounts/me/saved-niks/{id}`, masih asumsi. `nik` kosong berarti NIK tidak diganti. */
  update(id: string, input: SavedNikInput): Promise<void>;
  remove(id: string): Promise<void>;
}
