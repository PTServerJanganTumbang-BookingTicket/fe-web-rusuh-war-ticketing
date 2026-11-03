"use client";

// Login magic link. Requirement: FR-29, BR-09. ADR-0023 (login opsional, token di cookie httpOnly).

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import type { CoreDependencies } from "@/core/application/core.dependencies";
import { toAppError } from "@/core/domain/app-error";
import { useDependencies } from "@/core/controllers/dependencies.context";
import { useCountdown } from "@/core/controllers/countdown.hook";
import { t } from "@/core/i18n/t.utils";
import type { AuthDependencies } from "../application/auth.dependencies";
import { isEmail } from "../domain/account.rules";
import { RESEND_COOLDOWN_MS } from "../domain/auth.constants";
import { authErrorKey } from "./auth-error.mapper";
import type { LoginViewProps } from "../views/LoginView";

export function useLoginController(): LoginViewProps {
  const { requestMagicLinkUseCase, resendMagicLinkUseCase, clock, appConfig } = useDependencies<
    AuthDependencies & CoreDependencies
  >();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [resendAt, setResendAt] = useState<string | undefined>(undefined);

  const startCooldown = () => setResendAt(new Date(clock.now() + RESEND_COOLDOWN_MS).toISOString());
  const request = useMutation({
    mutationFn: (address: string) => requestMagicLinkUseCase(address),
    onSuccess: (_, address) => {
      setSentTo(address.trim());
      startCooldown();
    },
  });
  const resend = useMutation({
    mutationFn: (address: string) => resendMagicLinkUseCase(address),
    onSuccess: startCooldown,
  });
  // Jeda kirim ulang memakai jam lokal: ini batas UI, bukan TTL dari server (ADR-0005 tidak berlaku).
  const cooldownMs = useCountdown(resendAt, 0) ?? 0;
  const title = t("login.title");
  const failed = request.error ?? resend.error;
  const error = failed ? t(authErrorKey(toAppError(failed))) : undefined;

  if (sentTo) {
    const waiting = cooldownMs > 0;
    return {
      kind: "sent",
      title,
      error: resend.error ? error : undefined,
      heading: t("login.sent.title"),
      message: t("login.sent.message", { email: sentTo }),
      notice: resend.isSuccess && waiting ? t("login.resend.done") : undefined,
      resend: {
        label: waiting
          ? t("login.resend.wait", { seconds: Math.ceil(cooldownMs / 1000) })
          : t("login.resend"),
        disabled: waiting || resend.isPending,
        onClick: () => resend.mutate(sentTo),
      },
      changeEmail: {
        label: t("login.changeEmail"),
        onClick: () => {
          setSentTo(null);
          request.reset();
          resend.reset();
        },
      },
      mockLink: appConfig.mocking
        ? { label: t("login.mockLink"), href: `/login/verify#token=mock_${encodeURIComponent(sentTo)}` }
        : undefined,
    };
  }

  const emailError = submitted && !isEmail(email) ? t("login.email.invalid") : undefined;
  return {
    kind: "form",
    title,
    error,
    intro: t("login.intro"),
    optionalNote: t("login.optional"),
    email: {
      label: t("login.email.label"),
      placeholder: t("login.email.placeholder"),
      value: email,
      error: emailError,
      onChange: setEmail,
    },
    submit: {
      label: request.isPending ? t("login.sending") : t("login.submit"),
      disabled: request.isPending,
      onSubmit: () => {
        setSubmitted(true);
        if (isEmail(email)) request.mutate(email);
      },
    },
    register: { prompt: t("login.register.prompt"), label: t("login.register.link"), href: "/register" },
  };
}
