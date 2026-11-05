import { queryOptions } from "@tanstack/react-query";
import type { GetSessionAccountUseCase } from "@/core/application/get-session-account.use-case";

/**
 * Kunci cache sesi akun. Modul `auth` memakai kunci yang sama untuk akun di halaman profil, jadi masuk dan keluar
 * langsung memperbarui navbar di semua halaman tanpa invalidasi lintas modul.
 */
export const sessionKeys = { account: ["auth", "account"] as const };

export function sessionAccountQuery(deps: { getSessionAccountUseCase: GetSessionAccountUseCase }) {
  return queryOptions({
    queryKey: sessionKeys.account,
    queryFn: () => deps.getSessionAccountUseCase(),
    // Sesi jarang berubah selama satu kunjungan; masuk dan keluar menulis cache ini langsung.
    staleTime: 5 * 60_000,
    retry: false,
  });
}
