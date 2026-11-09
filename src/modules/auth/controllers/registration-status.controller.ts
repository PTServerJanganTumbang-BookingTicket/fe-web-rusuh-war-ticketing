"use client";

// Verifikasi email setelah register. Requirement: FR-31. ADR-0023.
// Desain "Confirmation & Success": verify your email → verification link sent → your email is verified.

import { useState, useSyncExternalStore } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CoreDependencies } from "@/core/application/core.dependencies";
import { toAppError } from "@/core/domain/app-error";
import { useDependencies } from "@/core/controllers/dependencies.context";
import { useCountdown } from "@/core/controllers/countdown.hook";
import { useSiteChrome } from "@/core/controllers/site-chrome.hook";
import { t } from "@/core/i18n/t.utils";
import type { AuthDependencies } from "../application/auth.dependencies";
import { RESEND_COOLDOWN_MS } from "../domain/auth.constants";
import { authErrorKey } from "./auth-error.mapper";
import { authKeys } from "./auth.queries";
import type { RegistrationStatusViewProps } from "../views/RegistrationStatusView";

const loginLink = () => ({ label: t("register.pending.login"), href: "/login" });

export function useVerifyEmailController(): RegistrationStatusViewProps {
  const siteChrome = useSiteChrome();
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
  const chrome = siteChrome;

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

const subscribeToLocation = (onChange: () => void) => {
  window.addEventListener("hashchange", onChange);
  window.addEventListener("popstate", onChange);
  return () => {
    window.removeEventListener("hashchange", onChange);
    window.removeEventListener("popstate", onChange);
  };
};
/** Token ada di query (`?token=`) atau fragmen (`#token=`); keduanya dikenali supaya tautan email tidak bergantung bentuknya. */
const readEmailToken = () =>
  new URLSearchParams(window.location.search).get("token") ??
  new URLSearchParams(window.location.hash.slice(1)).get("token");
const noTokenOnServer = () => undefined;

/**
 * Tujuan link verifikasi di email (`/register/verified?token=...`). Token dikonfirmasi ke `GET /auth/verify-email`;
 * tidak ada sesi yang terbit. Tautan kedaluwarsa (15 menit) cukup diganti dengan meminta link login.
 */
export function useEmailVerifiedController(): RegistrationStatusViewProps {
  const siteChrome = useSiteChrome();
  const { verifyEmailUseCase } = useDependencies<AuthDependencies>();
  const token = useSyncExternalStore(subscribeToLocation, readEmailToken, noTokenOnServer);
  // Tautan sekali pakai: tidak boleh diulang otomatis, dan hasilnya tidak basi selama halaman terbuka.
  const verify = useQuery({
    queryKey: authKeys.emailVerification(token ?? ""),
    queryFn: () => verifyEmailUseCase(token ?? "").then(() => true),
    enabled: Boolean(token),
    retry: false,
    staleTime: Infinity,
  });

  // Di server (token belum terbaca) dan selama pemeriksaan berjalan, tampilkan status memverifikasi.
  if (token === undefined || (token && verify.isPending)) {
    return {
      ...siteChrome,
      tone: "info",
      title: t("register.verifying.title"),
      message: t("register.verifying.message"),
      status: t("register.verifying.message"),
    };
  }

  if (verify.isSuccess) {
    return {
      ...siteChrome,
      tone: "success",
      title: t("register.verified.title"),
      message: t("register.verified.message"),
      link: { label: t("register.verified.login"), href: "/login" },
      footnote: t("register.verified.note"),
    };
  }

  const networkProblem = verify.isError && toAppError(verify.error).kind === "network";
  return {
    ...siteChrome,
    tone: "error",
    title: t("register.verifyFailed.title"),
    message: networkProblem ? t("register.verifyFailed.network") : t("register.verifyFailed.message"),
    detail: networkProblem ? undefined : t("register.verifyFailed.detail"),
    action: networkProblem
      ? {
          label: t("register.verifyFailed.retry"),
          busy: false,
          disabled: false,
          onClick: () => void verify.refetch(),
        }
      : undefined,
    link: { label: t("register.verifyFailed.login"), href: "/login" },
  };
}
