import type { SessionAccount } from "./session-account.model";

/**
 * Sesi akun dari route same-origin. Token akun tidak pernah sampai ke sini, hanya profil: email, NIK tersamar, dan
 * NIK lengkap pemilik akun bila BE mengirimnya (asumsi, `docs/api/contract-assumptions.md`).
 */
export interface SessionAccountProtocol {
  current(): Promise<SessionAccount | null>;
}
