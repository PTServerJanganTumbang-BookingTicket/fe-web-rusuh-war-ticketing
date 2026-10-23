import type { AppError, EmailLinkSent, RegistrationProblems } from "@rusuh/core";

// Kondisi layar Registrasi (ADR-0017, Figma SJT ZAKI frame Registration, Confirmation & Success, Error C/D/G).
// Murni dan tanpa i18n.

/** `register`: email + NIK. `resend`: hanya email, untuk meminta email verifikasi baru dari link yang gagal. */
export type RegisterMode = "register" | "resend";

/** Satu dialog untuk satu kejadian: review, proses, lalu galat bila ada (Figma: "one feedback surface per event"). */
export type RegisterDialog = { kind: "review" } | { kind: "submitting" } | { kind: "failed"; error: AppError };

export type RegisterScreenState =
  | {
      kind: "editing";
      mode: RegisterMode;
      email: string;
      nik: string;
      /** Hanya terisi setelah customer mencoba lanjut (Figma: galat tampil saat submit/blur, bukan saat mengetik). */
      problems: RegistrationProblems;
      submitting: boolean;
      error?: AppError;
      dialog?: RegisterDialog;
    }
  | {
      kind: "registered";
      mode: RegisterMode;
      sent: EmailLinkSent;
      resendInMs: number;
      resending: boolean;
      error?: AppError;
      simulation?: { busy: boolean };
    };

export type RegisterScreenInput = {
  mode: RegisterMode;
  email: string;
  nik: string;
  problems: RegistrationProblems;
  reviewing: boolean;
  submitting: boolean;
  submitError: AppError | undefined;
  sent: EmailLinkSent | undefined;
  resendInMs: number | null;
  resending: boolean;
  resendError: AppError | undefined;
  simulation: { busy: boolean } | undefined;
};

function dialogOf({ reviewing, submitting, submitError }: RegisterScreenInput): RegisterDialog | undefined {
  if (submitting) return { kind: "submitting" };
  if (submitError) return { kind: "failed", error: submitError };
  return reviewing ? { kind: "review" } : undefined;
}

export function deriveRegisterScreenState(input: RegisterScreenInput): RegisterScreenState {
  if (input.sent) {
    return {
      kind: "registered",
      mode: input.mode,
      sent: input.sent,
      resendInMs: input.resendInMs ?? 0,
      resending: input.resending,
      ...(input.resendError && { error: input.resendError }),
      ...(input.simulation && { simulation: input.simulation }),
    };
  }

  // NIK ditolak format oleh BE: kembali ke field, bukan dialog (Figma F: "errors belong beside their fields").
  const nikRejected = input.submitError?.kind === "api" && input.submitError.code === "NIK_INVALID";
  const problems = nikRejected ? { ...input.problems, nik: "invalid" as const } : input.problems;
  // Mode resend tidak punya dialog: galatnya tampil di atas form.
  const dialog = input.mode === "register" && !nikRejected ? dialogOf(input) : undefined;
  const formError = input.mode === "resend" ? input.submitError : undefined;

  return {
    kind: "editing",
    mode: input.mode,
    email: input.email,
    nik: input.nik,
    problems,
    submitting: input.submitting,
    ...(formError && { error: formError }),
    ...(dialog && { dialog }),
  };
}
