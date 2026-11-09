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
import { toServiceUnavailableDialog } from "./auth-dialogs.mapper";
import { useSiteChrome } from "@/core/controllers/site-chrome.hook";
import { useModal, type ActionDialogModel } from "@/core/controllers/modal.hook";
import { isUnexpectedError, toConnectionProblemDialog } from "@/core/controllers/common-dialogs.mapper";
import type { LoginViewProps } from "../views/LoginView";

function emailErrorKey(email: string) {
  if (email.trim() === "") return "login.email.required" as const;
  return isEmail(email) ? undefined : ("login.email.invalid" as const);
}

export function useLoginController(): LoginViewProps {
  const siteChrome = useSiteChrome();
  // Tanpa respons: "Koneksi bermasalah". Layanan auth galat (5xx, respons asing): "Layanan sedang tidak tersedia".
  const modal = useModal<{ kind: "connection" | "service"; action: "request" | "resend" }>();
  const { requestMagicLinkUseCase, resendMagicLinkUseCase, clock, appConfig } = useDependencies<
    AuthDependencies & CoreDependencies
  >();
  const expired = useSearchParams().get("session") === "expired";
  const [email, setEmail] = useState("");
  // Galat baru tampil setelah field ditinggalkan atau form dikirim, bukan saat mengetik.
  const [touched, setTouched] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  /** Dialog info setelah link terkirim; ditutup customer sekali, tidak muncul lagi saat kirim ulang. */
  const [sentInfoOpen, setSentInfoOpen] = useState(false);
  const [resendAt, setResendAt] = useState<string | undefined>(undefined);

  const startCooldown = () => setResendAt(new Date(clock.now() + RESEND_COOLDOWN_MS).toISOString());
  const request = useMutation({
    mutationFn: (address: string) => requestMagicLinkUseCase(address),
    onSuccess: (_, address) => {
      modal.close();
      setSentTo(address.trim());
      setSentInfoOpen(true);
      startCooldown();
    },
    onError: (failure) => openFailure(failure, "request"),
  });
  const resend = useMutation({
    mutationFn: (address: string) => resendMagicLinkUseCase(address),
    onSuccess: () => {
      modal.close();
      startCooldown();
    },
    onError: (failure) => openFailure(failure, "resend"),
  });
  function openFailure(failure: unknown, action: "request" | "resend") {
    const error = toAppError(failure);
    if (!isUnexpectedError(error)) return;
    modal.open({ kind: error.kind === "network" ? "connection" : "service", action });
  }
  /** Galat bisnis (mis. terlalu banyak permintaan) tetap di kartu; galat tak terduga sudah jadi dialog. */
  const inlineError = (failure: Error | null) =>
    failure && !isUnexpectedError(toAppError(failure)) ? t(authErrorKey(toAppError(failure))) : undefined;
  // Jeda kirim ulang memakai jam lokal: ini batas UI, bukan TTL dari server (ADR-0005 tidak berlaku).
  const cooldownMs = useCountdown(resendAt, 0) ?? 0;
  const chrome = siteChrome;
  let dialog: ActionDialogModel | undefined;
  const open = modal.modal;
  if (open) {
    const retry = {
      onRetry: () => (open.action === "resend" && sentTo ? resend.mutate(sentTo) : request.mutate(email)),
      onDismiss: modal.close,
      retrying: request.isPending || resend.isPending,
    };
    dialog =
      open.kind === "connection" ? toConnectionProblemDialog(retry) : toServiceUnavailableDialog(retry);
  }

  if (sentTo) {
    const waiting = cooldownMs > 0;
    if (!dialog && sentInfoOpen) {
      const closeInfo = () => setSentInfoOpen(false);
      dialog = {
        tone: "info",
        illustration: "email",
        title: t("login.sentDialog.title"),
        description: t("login.sentDialog.description"),
        primary: { label: t("login.sentDialog.ok"), onClick: closeInfo },
        onDismiss: closeInfo,
      };
    }
    return {
      ...chrome,
      kind: "sent",
      heading: t("login.sent.title"),
      // Pesan sama untuk email terdaftar atau tidak, supaya keberadaan akun tidak bocor.
      message: t("login.sent.message"),
      error: inlineError(resend.error),
      dialog,
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
    error: inlineError(request.error),
    dialog,
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
