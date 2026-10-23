import type { Account, EmailLinkSent } from "@rusuh/core";
import { emailLinkSentResponse, lastEmailLinkResponse, meResponse } from "../contracts/auth";
import { apiFetch, noContent } from "../http/client";
import {
  toAccount,
  toEmailLinkSent,
  toLoginLinkRequest,
  toRedeemLoginLinkRequest,
  toRegisterRequest,
  toVerificationEmailRequest,
  toVerifyEmailRequest,
} from "../mappers/auth";

const post = (body: unknown): RequestInit => ({
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});

export async function sendLoginLink(email: string, returnTo: string): Promise<EmailLinkSent> {
  return toEmailLinkSent(await apiFetch("/auth/login-link", emailLinkSentResponse, post(toLoginLinkRequest(email, returnTo))));
}

export async function redeemLoginLink(token: string): Promise<void> {
  await apiFetch("/auth/session", noContent, post(toRedeemLoginLinkRequest(token)));
}

export async function endSession(): Promise<void> {
  await apiFetch("/auth/session", noContent, { method: "DELETE" });
}

export async function getMe(): Promise<Account> {
  return toAccount(await apiFetch("/me", meResponse));
}

export async function registerAccount(email: string, nik: string): Promise<EmailLinkSent> {
  return toEmailLinkSent(await apiFetch("/auth/register", emailLinkSentResponse, post(toRegisterRequest(email, nik))));
}

export async function sendVerificationEmail(email: string): Promise<EmailLinkSent> {
  return toEmailLinkSent(await apiFetch("/auth/verification-email", emailLinkSentResponse, post(toVerificationEmailRequest(email))));
}

export async function verifyEmail(token: string): Promise<void> {
  await apiFetch("/auth/verify-email", noContent, post(toVerifyEmailRequest(token)));
}

/** Hanya ada di mock (MSW): token link terakhir di email, pengganti membuka email saat demo dan test. */
export async function emulateLastEmailLink(kind: "login" | "verification"): Promise<string> {
  return (await apiFetch(`/mock/auth/last-link?kind=${kind}`, lastEmailLinkResponse)).token;
}
