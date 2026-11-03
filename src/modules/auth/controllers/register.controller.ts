"use client";

// Register akun. Requirement: FR-30, FR-31, BR-02. ADR-0011 (NIK terikat akun), ADR-0023.

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toAppError } from "@/core/domain/app-error";
import { useDependencies } from "@/core/controllers/dependencies.context";
import { t } from "@/core/i18n/t.utils";
import type { AuthDependencies } from "../application/auth.dependencies";
import { isEmail, isNikFormat } from "../domain/account.rules";
import { PRIVACY_POLICY_VERSION } from "../domain/auth.constants";
import { authErrorKey } from "./auth-error.mapper";
import type { RegisterViewProps } from "../views/RegisterView";

export function useRegisterController(): RegisterViewProps {
  const { registerAccountUseCase } = useDependencies<AuthDependencies>();
  const [email, setEmail] = useState("");
  const [nik, setNik] = useState("");
  const [name, setName] = useState("");
  // Tidak pernah tercentang otomatis (UU PDP).
  const [consent, setConsent] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const register = useMutation({
    mutationFn: () => registerAccountUseCase({ email, nik, name, policyVersion: PRIVACY_POLICY_VERSION }),
  });
  const title = t("register.title");

  if (register.isSuccess) {
    return {
      kind: "done",
      title,
      heading: t("register.done.title"),
      message: t("register.done.message", { email: email.trim() }),
    };
  }

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

  return {
    kind: "form",
    title,
    intro: t("register.intro"),
    error,
    email: { label: t("register.email.label"), value: email, error: errors.email, onChange: setEmail },
    nik: {
      label: t("register.nik.label"),
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
      label: register.isPending ? t("register.submitting") : t("register.submit"),
      disabled: register.isPending,
      onSubmit: () => {
        setSubmitted(true);
        if (valid) register.mutate();
      },
    },
    login: { prompt: t("register.login.prompt"), label: t("register.login.link"), href: "/login" },
  };
}
