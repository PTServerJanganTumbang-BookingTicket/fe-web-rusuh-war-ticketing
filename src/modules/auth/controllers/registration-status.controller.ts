"use client";

// Verifikasi email setelah register. Requirement: FR-31. ADR-0023.
// Desain "Confirmation & Success": verify your email → verification link sent → your email is verified.

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { CoreDependencies } from "@/core/application/core.dependencies";
import { toAppError } from "@/core/domain/app-error";
import { useDependencies } from "@/core/controllers/dependencies.context";
import { useCountdown } from "@/core/controllers/countdown.hook";
import { toSiteChrome } from "@/core/controllers/site-chrome.utils";
import { t } from "@/core/i18n/t.utils";
import type { AuthDependencies } from "../application/auth.dependencies";
import { RESEND_COOLDOWN_MS } from "../domain/auth.constants";
import { authErrorKey } from "./auth-error.mapper";
import { authKeys } from "./auth.queries";
import type { RegistrationStatusViewProps } from "../views/RegistrationStatusView";

const loginLink = () => ({ label: t("register.pending.login"), href: "/login" });

export function useVerifyEmailController(): RegistrationStatusViewProps {
  const queryClient = useQueryClient();
  const { resendVerificationUseCase, clock } = useDependencies<AuthDependencies & CoreDependencies>();
  // Email hanya ada di cache klien dari langkah register. Setelah muat ulang, kirim ulang tidak tersedia.
  const email = queryClient.getQueryData<string>(authKeys.pendingRegistration);
  const [resendAt, setResendAt] = useState<string | undefined>(undefined);
  const resend = useMutation({
    mutationFn: () => resendVerificationUseCase(email ?? ""),
    onSuccess: () => setResendAt(new Date(clock.now() + RESEND_COOLDOWN_MS).toISOString()),
  });
  // Jeda kirim ulang memakai jam lokal: ini batas UI, bukan TTL dari server (ADR-0005 tidak berlaku).
  const cooldownMs = useCountdown(resendAt, 0) ?? 0;
  const chrome = toSiteChrome();

  if (resend.isSuccess) {
    const waiting = cooldownMs > 0;
    return {
      ...chrome,
      tone: "success",
      title: t("register.sent.title"),
      message: t("register.sent.message"),
      detail: t("register.sent.detail"),
      status: t("register.sent.status"),
      action: {
        label: waiting
          ? t("register.sent.wait", { seconds: Math.ceil(cooldownMs / 1000) })
          : t("register.pending.resend"),
        busy: resend.isPending,
        disabled: waiting || resend.isPending,
        onClick: () => resend.mutate(),
      },
      link: loginLink(),
    };
  }

  return {
    ...chrome,
    tone: "info",
    title: t("register.pending.title"),
    message: t("register.pending.message"),
    steps: [t("register.pending.step1"), t("register.pending.step2"), t("register.pending.step3")],
    detail: t("register.pending.spam"),
    error: resend.isError ? t(authErrorKey(toAppError(resend.error))) : undefined,
    action: email
      ? {
          label: t("register.pending.resend"),
          busy: resend.isPending,
          disabled: resend.isPending,
          onClick: () => resend.mutate(),
        }
      : undefined,
    link: loginLink(),
    footnote: t("register.pending.footnote"),
  };
}

/** Tujuan link verifikasi di email. Kontrak belum punya endpoint verifikasi pendaftaran; layar ini statis. */
export function useEmailVerifiedController(): RegistrationStatusViewProps {
  return {
    ...toSiteChrome(),
    tone: "success",
    title: t("register.verified.title"),
    message: t("register.verified.message"),
    link: { label: t("register.verified.login"), href: "/login" },
    footnote: t("register.verified.note"),
  };
}
