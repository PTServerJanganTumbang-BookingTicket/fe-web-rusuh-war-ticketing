"use client";

// Login magic link. Requirement: FR-29, BR-09. ADR-0023 (login opsional, token di cookie httpOnly).
// Desain: "Authentication — Login" (initial, focus/valid/invalid/busy, link sent, session expired).

import { useState } from "react";
import { useSearchParams } from "next/navigation";
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
import { toSiteChrome } from "@/core/controllers/site-chrome.utils";
import type { LoginViewProps } from "../views/LoginView";

function emailErrorKey(email: string) {
  if (email.trim() === "") return "login.email.required" as const;
  return isEmail(email) ? undefined : ("login.email.invalid" as const);
}

export function useLoginController(): LoginViewProps {
  const { requestMagicLinkUseCase, resendMagicLinkUseCase, clock, appConfig } = useDependencies<
    AuthDependencies & CoreDependencies
  >();
  const expired = useSearchParams().get("session") === "expired";
  const [email, setEmail] = useState("");
  // Galat baru tampil setelah field ditinggalkan atau form dikirim, bukan saat mengetik.
  const [touched, setTouched] = useState(false);
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
  const chrome = toSiteChrome();

  if (sentTo) {
    const waiting = cooldownMs > 0;
    return {
      ...chrome,
      kind: "sent",
      heading: t("login.sent.title"),
      // Pesan sama untuk email terdaftar atau tidak, supaya keberadaan akun tidak bocor.
      message: t("login.sent.message"),
      error: resend.error ? t(authErrorKey(toAppError(resend.error))) : undefined,
      notice: { title: t("login.sent.noticeTitle"), body: t("login.sent.notice") },
      help: t("login.sent.help"),
      resent: resend.isSuccess && waiting ? t("login.resend.done") : undefined,
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

  const errorKey = touched ? emailErrorKey(email) : undefined;
  const busy = request.isPending;
  return {
    ...chrome,
    kind: "form",
    variant: expired ? "expired" : "default",
    heading: expired ? t("login.expired.heading") : t("login.heading"),
    intro: expired ? t("login.expired.intro") : t("login.intro"),
    error: request.error ? t(authErrorKey(toAppError(request.error))) : undefined,
    email: {
      label: t("login.email.label"),
      placeholder: t("login.email.placeholder"),
      hint: t("login.email.hint"),
      value: email,
      error: errorKey ? t(errorKey) : undefined,
      onChange: (value) => {
        setEmail(value);
        if (request.isError) request.reset();
      },
      onBlur: () => setTouched(email.trim() !== ""),
    },
    requiredNote: t("login.required"),
    submit: {
      label: busy ? t("login.sending") : t(expired ? "login.expired.submit" : "login.submit"),
      busy,
      // Kosong atau sudah terbukti tidak valid: tombol mati. Fokus saja tidak mengaktifkannya.
      disabled: busy || email.trim() === "" || Boolean(errorKey),
      onSubmit: () => {
        setTouched(true);
        if (!emailErrorKey(email)) request.mutate(email);
      },
    },
    register: expired
      ? undefined
      : { prompt: t("login.register.prompt"), label: t("login.register.link"), href: "/register" },
    inboxHint: expired ? undefined : t("login.inboxHint"),
  };
}
