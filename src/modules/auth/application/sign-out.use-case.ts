import type { AuthProtocol } from "../domain/auth.protocol";

export type SignOutUseCase = () => Promise<void>;

/** Menghapus sesi akun di perangkat ini. */
export function createSignOutUseCase({ authService }: { authService: AuthProtocol }): SignOutUseCase {
  return () => authService.signOut();
}
