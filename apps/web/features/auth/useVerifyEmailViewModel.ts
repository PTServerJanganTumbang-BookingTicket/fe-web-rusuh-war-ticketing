"use client";

// Membuka link verifikasi email. Figma SJT ZAKI "Verification journey" dan Error H. ADR-0017.

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { toAppError } from "@rusuh/core";
import { application } from "../shared/composition";
import { deriveVerifyEmailScreenState, type VerifyEmailScreenState } from "./verifyEmailModel";

export type VerifyEmailViewModel = {
  state: VerifyEmailScreenState;
  actions: { goToLogin: () => void; requestNewEmail: () => void };
};

export function useVerifyEmailViewModel({ token }: { token: string | null }): VerifyEmailViewModel {
  const router = useRouter();
  const verify = useMutation({ mutationFn: () => application.verifyEmail(token) });

  // Sama seperti link login: token sekali pakai ditukar tepat sekali dan segera dihapus dari URL dan riwayat.
  const started = useRef(false);
  const { mutate } = verify;
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    window.history.replaceState(null, "", window.location.pathname);
    mutate();
  }, [mutate]);

  return {
    state: deriveVerifyEmailScreenState({ verified: verify.isSuccess, error: verify.isError ? toAppError(verify.error) : undefined }),
    actions: {
      goToLogin: () => router.replace("/login"),
      requestNewEmail: () => router.replace("/register?step=resend"),
    },
  };
}
