"use client";

// Register akun. Requirement: FR-30, FR-31, BR-02. ADR-0011 (NIK terikat akun), ADR-0023.
// Desain "Confirmation & Success": tinjau dulu, konfirmasi eksplisit, lalu verifikasi email. Tidak ada login otomatis.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toAppError } from "@/core/domain/app-error";
import { useDependencies } from "@/core/controllers/dependencies.context";
import { toSiteChrome } from "@/core/controllers/site-chrome.utils";
import { t } from "@/core/i18n/t.utils";
import type { AuthDependencies } from "../application/auth.dependencies";
import { isEmail, isNikFormat } from "../domain/account.rules";
import { PRIVACY_POLICY_VERSION } from "../domain/auth.constants";
import { authErrorKey } from "./auth-error.mapper";
import { authKeys } from "./auth.queries";
import type { RegisterViewProps } from "../views/RegisterView";

export function useRegisterController(): RegisterViewProps {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { registerAccountUseCase } = useDependencies<AuthDependencies>();
  const [email, setEmail] = useState("");
  const [nik, setNik] = useState("");
  const [name, setName] = useState("");
  // Tidak pernah tercentang otomatis (UU PDP).
  const [consent, setConsent] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  // Satu permintaan saja: tombol terkunci selama berjalan, galat membuka kunci tanpa menghapus isian.
  const register = useMutation({
    mutationFn: () => registerAccountUseCase({ email, nik, name, policyVersion: PRIVACY_POLICY_VERSION }),
    onSuccess: () => queryClient.setQueryData(authKeys.pendingRegistration, email.trim()),
  });

  const errors = {
    email: submitted && !isEmail(email) ? t("login.email.invalid") : undefined,
    nik: submitted && !isNikFormat(nik) ? t("register.nik.invalid") : undefined,
    consent: submitted && !consent ? t("register.consent.required") : undefined,
  };
  const valid = isEmail(email) && isNikFormat(nik) && consent;
  const error = register.isError
    ? t(
        authErrorKey(toAppError(register.error), {
          NIK_ALREADY_REGISTERED: "register.error.NIK_ALREADY_REGISTERED",
          NIK_INVALID: "register.error.NIK_INVALID",
          CONSENT_REQUIRED: "register.error.CONSENT_REQUIRED",
        }),
      )
    : undefined;
  const busy = register.isPending;

  let dialog: RegisterViewProps["dialog"];
  if (register.isSuccess) {
    dialog = {
      kind: "success",
      title: t("register.success.title"),
      message: t("register.success.message"),
      note: t("register.success.note"),
      ok: { label: t("register.success.ok"), onClick: () => router.push("/register/verify-email") },
    };
  } else if (reviewing) {
    dialog = {
      kind: "confirm",
      title: t("register.confirm.title"),
      description: t("register.confirm.description"),
      values: [
        { label: t("register.confirm.email"), value: email.trim() },
        { label: t("register.confirm.nik"), value: nik },
        ...(name.trim() ? [{ label: t("register.confirm.name"), value: name.trim() }] : []),
      ],
      error,
      busy,
      busyNote: t("register.confirm.busyNote"),
      confirm: {
        label: busy ? t("register.confirm.busy") : t("register.confirm.submit"),
        onClick: () => register.mutate(),
      },
      // Ubah data hanya menutup dialog; isian tetap ada dan tidak ada request ke server.
      edit: {
        label: t("register.confirm.edit"),
        onClick: () => {
          setReviewing(false);
          register.reset();
        },
      },
    };
  }

  return {
    ...toSiteChrome(),
    kind: "form",
    heading: t("register.heading"),
    intro: t("register.intro"),
    email: {
      label: t("register.email.label"),
      required: true,
      value: email,
      error: errors.email,
      onChange: setEmail,
    },
    nik: {
      label: t("register.nik.label"),
      required: true,
      hint: t("register.nik.hint"),
      value: nik,
      error: errors.nik,
      // Spasi dan tanda baca dari salinan KTP dibuang; panjang divalidasi, tidak dipotong.
      onChange: (value) => setNik(value.replace(/\D/g, "")),
    },
    name: { label: t("register.name.label"), value: name, onChange: setName },
    consent: {
      label: t("register.consent.label"),
      checked: consent,
      error: errors.consent,
      onChange: setConsent,
    },
    submit: {
      label: t("register.submit"),
      busy,
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
