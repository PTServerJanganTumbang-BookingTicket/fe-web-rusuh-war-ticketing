import { emailProblem, resolveReturnTo, type EmailProblem } from "../auth/validation";
import type { EmailLinkSent } from "../domain/account";
import type { SendLoginLink } from "./ports";

export type RequestLoginLinkDeps = { sendLoginLink: SendLoginLink };

export type RequestLoginLinkResult = { status: "invalid"; problem: EmailProblem } | { status: "sent"; sent: EmailLinkSent };

/**
 * Login passwordless (Figma SJT ZAKI, frame Login). Email yang kosong atau salah format tidak dikirim ke BE, dan
 * `returnTo` disaring ke path same-origin sebelum dititipkan ke link. Kegagalan port (mis. RATE_LIMITED) dilempar apa adanya.
 */
export async function requestLoginLink(deps: RequestLoginLinkDeps, email: string, returnTo: string | null): Promise<RequestLoginLinkResult> {
  const problem = emailProblem(email);
  if (problem) return { status: "invalid", problem };
  return { status: "sent", sent: await deps.sendLoginLink(email.trim(), resolveReturnTo(returnTo)) };
}
