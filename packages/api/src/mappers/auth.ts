import type { Account, EmailLinkSent } from "@rusuh/core";
import type {
  EmailLinkSentResponseDto,
  LoginLinkRequestDto,
  MeResponseDto,
  RedeemLoginLinkRequestDto,
  RegisterRequestDto,
  VerificationEmailRequestDto,
  VerifyEmailRequestDto,
} from "../contracts/auth";

export function toLoginLinkRequest(email: string, returnTo: string): LoginLinkRequestDto {
  return { email, returnTo };
}

export function toEmailLinkSent(dto: EmailLinkSentResponseDto): EmailLinkSent {
  return { email: dto.email, resendAvailableAt: dto.resendAvailableAt, serverNow: dto.serverNow };
}

export function toRedeemLoginLinkRequest(token: string): RedeemLoginLinkRequestDto {
  return { token };
}

export function toAccount(dto: MeResponseDto): Account {
  return { email: dto.email, maskedNik: dto.maskedNik, emailVerified: dto.emailVerified };
}

export function toRegisterRequest(email: string, nik: string): RegisterRequestDto {
  return { email, nik };
}

export function toVerificationEmailRequest(email: string): VerificationEmailRequestDto {
  return { email };
}

export function toVerifyEmailRequest(token: string): VerifyEmailRequestDto {
  return { token };
}
