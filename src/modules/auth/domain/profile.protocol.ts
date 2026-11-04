import type { Profile } from "./account.model";

/** Profil akun yang sedang masuk. `GET /accounts/me` masih asumsi (docs/api/contract-assumptions.md). */
export interface ProfileProtocol {
  get(): Promise<Profile>;
}
