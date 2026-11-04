import type { SessionAccount } from "./session-account.model";

/** Sesi akun dari route same-origin. Token akun tidak pernah sampai ke sini, hanya profil tersamar. */
export interface SessionAccountProtocol {
  current(): Promise<SessionAccount | null>;
}
