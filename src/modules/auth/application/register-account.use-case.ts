import type { RegisterInput } from "../domain/account.model";
import type { AuthProtocol } from "../domain/auth.protocol";

export type RegisterAccountUseCase = (input: RegisterInput) => Promise<void>;

/** Membuat akun; link verifikasi dikirim ke email. Requirement: FR-30, FR-31. */
export function createRegisterAccountUseCase({
  authService,
}: {
  authService: AuthProtocol;
}): RegisterAccountUseCase {
  return (input) => authService.register({ ...input, email: input.email.trim(), name: input.name.trim() });
}
