import type { Profile } from "../domain/account.model";
import type { ProfileProtocol } from "../domain/profile.protocol";

export type GetProfileUseCase = () => Promise<Profile>;

/** Profil akun yang sedang masuk. */
export function createGetProfileUseCase({
  profileService,
}: {
  profileService: ProfileProtocol;
}): GetProfileUseCase {
  return () => profileService.get();
}
