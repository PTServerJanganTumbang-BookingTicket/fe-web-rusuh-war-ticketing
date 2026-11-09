import type { SavedNikInput, SavedNikList } from "./account.model";

/** Daftar alias (saved NIK) milik akun (maksimal dari server, saat ini 5). Hanya untuk customer yang masuk. */
export interface SavedNikProtocol {
  list(): Promise<SavedNikList>;
  add(input: SavedNikInput): Promise<void>;
  remove(id: string): Promise<void>;
}
