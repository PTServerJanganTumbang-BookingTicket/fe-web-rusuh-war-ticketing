"use client";

// Registrasi. Figma SJT ZAKI frame Registration (email + NIK), Confirmation & Success (review → daftar → verifikasi),
// Error & Fallback C, D, G. ADR-0011 (NIK terikat akun), ADR-0017 (screen model).

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { emulateLastEmailLink } from "@rusuh/api";
import {
  emailProblem,
  registrationProblems,
  sanitizeNikInput,
  serverOffsetMs,
  toAppError,
  type EmailLinkSent,
  type RegistrationProblems,
} from "@rusuh/core";
import { application } from "../shared/composition";
import { useCountdown } from "../shared/useCountdown";
import { deriveRegisterScreenState, type RegisterMode, type RegisterScreenState } from "./registerModel";

// Kontrol simulasi hanya muncul saat API dimock; di backend asli link dibuka dari email.
const mocking = process.env.NEXT_PUBLIC_API_MOCKING === "enabled";

export type RegisterViewModel = {
  state: RegisterScreenState;
  actions: {
    changeEmail: (email: string) => void;
    changeNik: (nik: string) => void;
    /** Mode register: validasi lalu buka review (tanpa memanggil BE). Mode resend: kirim email verifikasi. */
    submit: () => void;
    confirm: () => void;
    closeDialog: () => void;
    goToLogin: () => void;
    resend: () => void;
    simulateOpenLink: () => void;
  };
};

type Sent = { sent: EmailLinkSent; receivedAt: number };

export function useRegisterViewModel({ step }: { step: string | null }): RegisterViewModel {
  const router = useRouter();
  const mode: RegisterMode = step === "resend" ? "resend" : "register";

  const [email, setEmail] = useState("");
  const [nik, setNik] = useState("");
  const [problems, setProblems] = useState<RegistrationProblems>({});
  const [reviewing, setReviewing] = useState(false);
  const [sent, setSent] = useState<Sent>();

  const received = (next: EmailLinkSent) => setSent({ sent: next, receivedAt: Date.now() });
  const register = useMutation({
    mutationFn: () => application.registerAccount({ email, nik }),
    onSuccess: (result) => {
      if (result.status === "invalid") {
        setProblems(result.problems);
        setReviewing(false);
        return;
      }
      setReviewing(false);
      received(result.sent);
    },
  });
  const resend = useMutation({ mutationFn: application.resendVerificationEmail, onSuccess: received });
  const openLink = useMutation({
    mutationFn: () => emulateLastEmailLink("verification"),
    onSuccess: (token) => router.push(`/auth/verify-email?${new URLSearchParams({ token })}`),
  });

  const offsetMs = sent ? serverOffsetMs(Date.parse(sent.sent.serverNow), sent.receivedAt) : 0;
  const resendInMs = useCountdown(sent?.sent.resendAvailableAt, offsetMs);
  const formMutation = mode === "register" ? register : resend;

  return {
    state: deriveRegisterScreenState({
      mode,
      email,
      nik,
      problems,
      reviewing,
      submitting: !sent && formMutation.isPending,
      submitError: !sent && formMutation.isError ? toAppError(formMutation.error) : undefined,
      sent: sent?.sent,
      resendInMs,
      resending: !!sent && resend.isPending,
      resendError: sent && resend.isError ? toAppError(resend.error) : undefined,
      simulation: mocking ? { busy: openLink.isPending } : undefined,
    }),
    actions: {
      changeEmail: (value) => {
        setEmail(value);
        setProblems((current) => ({ ...current, email: undefined }));
      },
      changeNik: (value) => {
        setNik(sanitizeNikInput(value));
        setProblems((current) => ({ ...current, nik: undefined }));
      },
      submit: () => {
        if (mode === "resend") {
          const problem = emailProblem(email);
          if (problem) return setProblems({ email: problem });
          return resend.mutate(email.trim());
        }
        const found = registrationProblems({ email, nik });
        setProblems(found);
        if (!found.email && !found.nik) setReviewing(true);
      },
      confirm: () => register.mutate(),
      closeDialog: () => {
        setReviewing(false);
        register.reset();
      },
      goToLogin: () => router.push("/login"),
      resend: () => {
        if (sent) resend.mutate(sent.sent.email);
      },
      simulateOpenLink: () => openLink.mutate(),
    },
  };
}
