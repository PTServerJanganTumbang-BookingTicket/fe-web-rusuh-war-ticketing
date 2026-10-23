import type { Account, AppError, EmailProblem, EmailLinkSent } from "@rusuh/core";
import type { LoginReason } from "../shared/authRedirect";

// Kondisi layar Login passwordless (ADR-0017, Figma SJT ZAKI frame Login). Murni dan tanpa i18n.

export type LoginScreenState =
  /** `/me` sedang dicek: belum tahu apakah customer sudah login. */
  | { kind: "checking" }
  | { kind: "signedIn"; account: Account; loggingOut: boolean }
  | { kind: "editing"; email: string; problem?: EmailProblem; error?: AppError; submitting: boolean; reason?: LoginReason }
  | {
      kind: "sent";
      sent: EmailLinkSent;
      /** Sisa jeda sebelum boleh kirim ulang, dari jam server (ADR-0005). */
      resendInMs: number;
      resending: boolean;
      error?: AppError;
      /** Hanya ada saat API dimock: pengganti membuka email. */
      simulation?: { busy: boolean };
    };

export type LoginScreenInput = {
  account: Account | undefined;
  checking: boolean;
  email: string;
  problem: EmailProblem | undefined;
  sent: EmailLinkSent | undefined;
  sending: boolean;
  sendError: AppError | undefined;
  resendInMs: number | null;
  loggingOut: boolean;
  reason: LoginReason | undefined;
  simulation: { busy: boolean } | undefined;
};

export function deriveLoginScreenState(input: LoginScreenInput): LoginScreenState {
  if (input.account) return { kind: "signedIn", account: input.account, loggingOut: input.loggingOut };
  if (input.checking) return { kind: "checking" };
  if (input.sent) {
    return {
      kind: "sent",
      sent: input.sent,
      resendInMs: input.resendInMs ?? 0,
      resending: input.sending,
      ...(input.sendError && { error: input.sendError }),
      ...(input.simulation && { simulation: input.simulation }),
    };
  }
  return {
    kind: "editing",
    email: input.email,
    submitting: input.sending,
    ...(input.problem && { problem: input.problem }),
    ...(input.sendError && { error: input.sendError }),
    ...(input.reason && { reason: input.reason }),
  };
}
