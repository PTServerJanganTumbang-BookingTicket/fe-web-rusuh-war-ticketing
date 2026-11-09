import type { Account, EventSummary, LoginResult, RegisterInput } from "./account.model";

/** Login magic link dan register sesuai kontrak §1 (ADR-0023). */
export interface AuthProtocol {
  requestMagicLink(email: string): Promise<void>;
  resendMagicLink(email: string): Promise<void>;
  register(input: RegisterInput): Promise<void>;
  /** Kirim ulang email verifikasi pendaftaran. */
  resendVerification(email: string): Promise<void>;
  /** Konfirmasi email dari tautan pendaftaran (`GET /auth/verify-email`). Tidak menerbitkan sesi. */
  verifyEmail(token: string): Promise<void>;
  /** Menukar token dari link email dengan sesi akun di cookie httpOnly. */
  verify(token: string): Promise<LoginResult>;
  /** `null` berarti tamu. */
  getAccount(): Promise<Account | null>;
  signOut(): Promise<void>;
  /** Event booking yang dipulihkan setelah login (kartu konteks). */
  getEventSummary(eventId: string): Promise<EventSummary>;
}
