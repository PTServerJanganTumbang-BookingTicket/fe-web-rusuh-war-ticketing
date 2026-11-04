import { queryOptions } from "@tanstack/react-query";
import { sessionKeys } from "@/core/controllers/session.queries";
import type { GetAccountUseCase } from "../application/get-account.use-case";
import type { ListSavedNiksUseCase } from "../application/list-saved-niks.use-case";
import type { GetProfileUseCase } from "../application/get-profile.use-case";

export const authKeys = {
  // Sama dengan kunci sesi navbar di core: masuk dan keluar langsung terlihat di navbar.
  account: sessionKeys.account,
  savedNiks: ["auth", "saved-niks"] as const,
  profile: ["auth", "profile"] as const,
  /** Email yang baru didaftarkan, untuk layar verifikasi email. Hanya di cache klien, tidak di URL. */
  pendingRegistration: ["auth", "pending-registration"] as const,
};

/** Akun dari cookie sesi. `null` berarti tamu; tidak ada token di cache, hanya email dan NIK tersamar. */
export function accountQuery(deps: { getAccountUseCase: GetAccountUseCase }) {
  return queryOptions({ queryKey: authKeys.account, queryFn: () => deps.getAccountUseCase() });
}

export function savedNiksQuery(deps: { listSavedNiksUseCase: ListSavedNiksUseCase }) {
  return queryOptions({ queryKey: authKeys.savedNiks, queryFn: () => deps.listSavedNiksUseCase() });
}

export function profileQuery(deps: { getProfileUseCase: GetProfileUseCase }) {
  return queryOptions({ queryKey: authKeys.profile, queryFn: () => deps.getProfileUseCase() });
}
