import type { SavedNikList } from "./account.model";

/** Daftar NIK teman milik akun (maksimal dari server, saat ini 5). Hanya untuk customer yang masuk. */
export interface SavedNikProtocol {
  list(): Promise<SavedNikList>;
  add(nik: string, label: string): Promise<void>;
  remove(id: string): Promise<void>;
}
