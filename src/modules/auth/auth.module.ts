import { asFunction, type NameAndRegistrationPair } from "awilix";
import { createRequestMagicLinkUseCase } from "./application/request-magic-link.use-case";
import { createResendMagicLinkUseCase } from "./application/resend-magic-link.use-case";
import { createRegisterAccountUseCase } from "./application/register-account.use-case";
import { createResendVerificationUseCase } from "./application/resend-verification.use-case";
import { createVerifyLoginUseCase } from "./application/verify-login.use-case";
import { createVerifyEmailUseCase } from "./application/verify-email.use-case";
import { createGetAccountUseCase } from "./application/get-account.use-case";
import { createGetEventSummaryUseCase } from "./application/get-event-summary.use-case";
import { createSignOutUseCase } from "./application/sign-out.use-case";
import { createListSavedNiksUseCase } from "./application/list-saved-niks.use-case";
import { createAddSavedNikUseCase } from "./application/add-saved-nik.use-case";
import { createRemoveSavedNikUseCase } from "./application/remove-saved-nik.use-case";
import { createUpdateSavedNikUseCase } from "./application/update-saved-nik.use-case";
import { createGetProfileUseCase } from "./application/get-profile.use-case";
import type { AuthDependencies } from "./application/auth.dependencies";
import type { AuthProtocol } from "./domain/auth.protocol";
import type { SavedNikProtocol } from "./domain/saved-nik.protocol";
import type { ProfileProtocol } from "./domain/profile.protocol";
import { createHttpAuthService } from "./data/http-auth.service";
import { createHttpSavedNikService } from "./data/http-saved-nik.service";
import { createHttpProfileService } from "./data/http-profile.service";

export type AuthRegistry = AuthDependencies & {
  authService: AuthProtocol;
  savedNikService: SavedNikProtocol;
  profileService: ProfileProtocol;
};

export function authModule(): NameAndRegistrationPair<AuthRegistry> {
  return {
    authService: asFunction(createHttpAuthService).singleton(),
    savedNikService: asFunction(createHttpSavedNikService).singleton(),
    profileService: asFunction(createHttpProfileService).singleton(),
    requestMagicLinkUseCase: asFunction(createRequestMagicLinkUseCase).singleton(),
    resendMagicLinkUseCase: asFunction(createResendMagicLinkUseCase).singleton(),
    registerAccountUseCase: asFunction(createRegisterAccountUseCase).singleton(),
    resendVerificationUseCase: asFunction(createResendVerificationUseCase).singleton(),
    verifyLoginUseCase: asFunction(createVerifyLoginUseCase).singleton(),
    verifyEmailUseCase: asFunction(createVerifyEmailUseCase).singleton(),
    getAccountUseCase: asFunction(createGetAccountUseCase).singleton(),
    getEventSummaryUseCase: asFunction(createGetEventSummaryUseCase).singleton(),
    signOutUseCase: asFunction(createSignOutUseCase).singleton(),
    listSavedNiksUseCase: asFunction(createListSavedNiksUseCase).singleton(),
    addSavedNikUseCase: asFunction(createAddSavedNikUseCase).singleton(),
    updateSavedNikUseCase: asFunction(createUpdateSavedNikUseCase).singleton(),
    removeSavedNikUseCase: asFunction(createRemoveSavedNikUseCase).singleton(),
    getProfileUseCase: asFunction(createGetProfileUseCase).singleton(),
  };
}
