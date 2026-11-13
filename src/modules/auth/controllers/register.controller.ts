"use client";

// Register akun. Requirement: FR-30, FR-31, BR-02. ADR-0011 (NIK terikat akun), ADR-0023.
// Desain "Confirmation & Success": tinjau dulu, konfirmasi eksplisit, lalu verifikasi email. Tidak ada login otomatis.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toAppError, type AppError } from "@/core/domain/app-error";
import { EMAIL_MAX_LENGTH } from "@/core/domain/email.constants";
import { useDependencies } from "@/core/controllers/dependencies.context";
import { useSiteChrome } from "@/core/controllers/site-chrome.hook";
import { legalLinks } from "@/core/controllers/site-chrome.utils";
import { NIK_LENGTH, sanitizeNikInput } from "@/core/domain/nik.utils";
import { useModal, type ActionDialogModel } from "@/core/controllers/modal.hook";
import { toConnectionProblemDialog } from "@/core/controllers/common-dialogs.mapper";
import { toNikMismatchDialog } from "@/core/controllers/nik-dialog.mapper";
import { t } from "@/core/i18n/t.utils";
import type { AuthDependencies } from "../application/auth.dependencies";
import { emailInputError, isNikFormat } from "../domain/account.rules";
import { authErrorKey, visibleEmailError } from "./auth-error.mapper";
import { authKeys } from "./auth.queries";
import { toAlreadyRegisteredDialog, toRegistrationFailedDialog } from "./auth-dialogs.mapper";
import type { RegisterViewProps } from "../views/RegisterView";

/** Galat register yang ditangani dialog sendiri; sisanya tampil di dialog tinjauan. */
type RegisterModal = { kind: "connection" | "failed" | "alreadyRegistered" | "nikMismatch" };

function registerModalOf(error: AppError): RegisterModal["kind"] | null {
  if (error.kind === "network") return "connection";
  if (error.kind === "api") {
    if (error.code === "NIK_ALREADY_REGISTERED") return "alreadyRegistered";
    if (error.code === "NIK_INVALID") return "nikMismatch";
    return null;
  }
  return "failed";
}

export function useRegisterController(): RegisterViewProps {
  const siteChrome = useSiteChrome();
  const modal = useModal<RegisterModal>();
  /** Fokus kembali ke field setelah "Ubah email" atau "Ubah data"; `n` berubah tiap permintaan. */
  const [focus, setFocus] = useState<{ field: "email" | "nik"; n: number } | null>(null);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { registerAccountUseCase } = useDependencies<AuthDependencies>();
  const [email, setEmail] = useState("");
  const [nik, setNik] = useState("");
  // Tidak pernah tercentang otomatis (UU PDP).
  const [consent, setConsent] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  /** Field yang sudah ditinggalkan; galat bentuknya tampil tanpa menunggu submit. */
  const [touched, setTouched] = useState<{ email: boolean; nik: boolean }>({ email: false, nik: false });
  const [reviewing, setReviewing] = useState(false);
  // Satu permintaan saja: tombol terkunci selama berjalan, galat membuka kunci tanpa menghapus isian.
  const register = useMutation({
    mutationFn: () => registerAccountUseCase({ email, nik }),
    onSuccess: () => {
      modal.close();
      queryClient.setQueryData(authKeys.pendingRegistration, email.trim());
    },
    // Galat yang punya dialog sendiri menutup tinjauan; isian tetap ada.
    onError: (failure) => {
      const kind = registerModalOf(toAppError(failure));
      if (!kind) return;
      setReviewing(false);
      modal.open({ kind });
    },
  });

  const emailProblem = emailInputError(email);
  const errors = {
    email: visibleEmailError(emailProblem, submitted || touched.email),
    nik: (submitted || touched.nik) && !isNikFormat(nik) ? t("register.nik.invalid") : undefined,
    consent: submitted && !consent ? t("register.consent.required") : undefined,
  };
  const valid = emailProblem === null && isNikFormat(nik) && consent;
  const inlineError =
    register.isError && !registerModalOf(toAppError(register.error))
      ? t(authErrorKey(toAppError(register.error), { CONSENT_REQUIRED: "register.error.CONSENT_REQUIRED" }))
      : undefined;
  const busy = register.isPending;
  const refocus = (field: "email" | "nik") => {
    modal.close();
    register.reset();
    setFocus((current) => ({ field, n: (current?.n ?? 0) + 1 }));
  };
  const retry = { onRetry: () => register.mutate(), onDismiss: modal.close, retrying: busy };

  let dialog: ActionDialogModel | undefined;
  if (register.isSuccess) {
    dialog = {
      tone: "success",
      illustration: "success",
      title: t("register.success.title"),
      description: t("register.success.message"),
      note: t("register.success.note"),
      primary: { label: t("register.success.ok"), onClick: () => router.push("/register/verify-email") },
      onDismiss: () => router.push("/register/verify-email"),
    };
  } else if (modal.modal?.kind === "connection") {
    dialog = toConnectionProblemDialog(retry);
  } else if (modal.modal?.kind === "failed") {
    dialog = toRegistrationFailedDialog(retry);
  } else if (modal.modal?.kind === "alreadyRegistered") {
    dialog = toAlreadyRegisteredDialog({ onEdit: () => refocus("email"), onDismiss: modal.close });
  } else if (modal.modal?.kind === "nikMismatch") {
    dialog = toNikMismatchDialog({ onEdit: () => refocus("nik"), onDismiss: modal.close });
  } else if (reviewing) {
    // Ubah data hanya menutup dialog; isian tetap ada dan tidak ada request ke server.
    const edit = () => {
      setReviewing(false);
      register.reset();
    };
    dialog = {
      tone: "info",
      illustration: "confirmation",
      title: t("register.confirm.title"),
      description: t("register.confirm.description"),
      details: [
        { label: t("register.confirm.email"), value: email.trim() },
        { label: t("register.confirm.nik"), value: nik },
      ],
      note: busy ? t("register.confirm.busyNote") : undefined,
      error: inlineError,
      primary: {
        label: busy ? t("register.confirm.busy") : t("register.confirm.submit"),
        busy,
        onClick: () => register.mutate(),
      },
      // Selama permintaan berjalan, "Ubah data" disembunyikan dan dialog sudah menahan penutupan.
      secondary: busy ? undefined : { label: t("register.confirm.edit"), onClick: edit },
      onDismiss: edit,
    };
  }

  return {
    ...siteChrome,
    kind: "form",
    heading: t("register.heading"),
    intro: t("register.intro"),
    email: {
      label: t("register.email.label"),
      required: true,
      value: email,
      focusKey: focus?.field === "email" ? focus.n : undefined,
      // Batas di input; nilai yang lolos (tempelan, isian otomatis) ditolak validasi, tidak dipotong diam-diam.
      maxLength: EMAIL_MAX_LENGTH,
      error: errors.email,
      onChange: setEmail,
      onBlur: () => setTouched((current) => ({ ...current, email: email.trim() !== "" })),
    },
    nik: {
      label: t("register.nik.label"),
      required: true,
      hint: t("register.nik.hint"),
      value: nik,
      focusKey: focus?.field === "nik" ? focus.n : undefined,
      maxLength: NIK_LENGTH,
      error: errors.nik,
      // Hanya digit (spasi dan tanda baca dari salinan KTP dibuang), maksimal 16: digit berlebih ditolak.
      onChange: (value) => setNik(sanitizeNikInput(value)),
      onBlur: () => setTouched((current) => ({ ...current, nik: nik !== "" })),
    },
    consent: {
      label: t("register.consent.label"),
      links: legalLinks(),
      checked: consent,
      error: errors.consent,
      onChange: setConsent,
    },
    submit: {
      label: t("register.submit"),
      busy,
      // Format email salah, NIK belum 16 digit, atau persetujuan belum dicentang: tombol abu-abu.
      disabled: !valid,
      onSubmit: () => {
        setSubmitted(true);
        if (valid) setReviewing(true);
      },
    },
    requiredNote: t("login.required"),
    login: { prompt: t("register.login.prompt"), label: t("register.login.link"), href: "/login" },
    dialog,
  };
}
