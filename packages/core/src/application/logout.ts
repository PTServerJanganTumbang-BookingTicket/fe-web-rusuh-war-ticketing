import type { EndSession } from "./ports";

export type LogoutDeps = { endSession: EndSession };

/** Keluar. Antrian, booking, dan order tetap milik akun di server (ADR-0010); FE tidak membatalkan apa pun. */
export async function logout(deps: LogoutDeps): Promise<void> {
  await deps.endSession();
}
