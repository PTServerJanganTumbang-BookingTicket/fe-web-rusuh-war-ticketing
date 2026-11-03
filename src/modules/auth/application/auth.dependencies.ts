import type { RequestMagicLinkUseCase } from "./request-magic-link.use-case";
import type { ResendMagicLinkUseCase } from "./resend-magic-link.use-case";
import type { RegisterAccountUseCase } from "./register-account.use-case";
import type { VerifyLoginUseCase } from "./verify-login.use-case";
import type { GetAccountUseCase } from "./get-account.use-case";
import type { GetEventSummaryUseCase } from "./get-event-summary.use-case";
import type { SignOutUseCase } from "./sign-out.use-case";
import type { ListSavedNiksUseCase } from "./list-saved-niks.use-case";
import type { AddSavedNikUseCase } from "./add-saved-nik.use-case";
import type { RemoveSavedNikUseCase } from "./remove-saved-nik.use-case";

/** Irisan container untuk controller modul auth. */
export type AuthDependencies = {
  requestMagicLinkUseCase: RequestMagicLinkUseCase;
  resendMagicLinkUseCase: ResendMagicLinkUseCase;
  registerAccountUseCase: RegisterAccountUseCase;
  verifyLoginUseCase: VerifyLoginUseCase;
  getAccountUseCase: GetAccountUseCase;
  getEventSummaryUseCase: GetEventSummaryUseCase;
  signOutUseCase: SignOutUseCase;
  listSavedNiksUseCase: ListSavedNiksUseCase;
  addSavedNikUseCase: AddSavedNikUseCase;
  removeSavedNikUseCase: RemoveSavedNikUseCase;
};
