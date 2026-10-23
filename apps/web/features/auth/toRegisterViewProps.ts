import type { AppError, EmailProblem, NikProblem } from "@rusuh/core";
import { t } from "@rusuh/i18n";
import type { RegisterViewProps } from "@rusuh/ui";
import type { RegisterScreenState } from "./registerModel";
import type { RegisterViewModel } from "./useRegisterViewModel";

type Actions = RegisterViewModel["actions"];
type Editing = Extract<RegisterScreenState, { kind: "editing" }>;

const EMAIL_PROBLEM = { required: "login.email.required", invalid: "login.email.invalid" } as const satisfies Record<EmailProblem, string>;
const NIK_PROBLEM = { required: "register.nik.required", invalid: "register.nik.invalid" } as const satisfies Record<NikProblem, string>;

function retrySeconds(error: AppError): number {
  return Math.ceil((error.kind === "api" && error.retryAfterMs ? error.retryAfterMs : 30_000) / 1000);
}

function isCode(error: AppError, code: string): boolean {
  return error.kind === "api" && error.code === code;
}

/** Galat setelah "Konfirmasi dan Daftar": judul, pesan, dan langkah lanjut per kasus (Figma Error C, D, G). */
function toFailedDialog(error: AppError, actions: Actions): Omit<NonNullable<RegisterViewProps["dialog"]>, "dismissible" | "onClose"> {
  const edit = { label: t("register.dialog.edit"), onClick: actions.closeDialog };
  const retry = { label: t("register.dialog.retry"), onClick: actions.confirm };

  if (isCode(error, "EMAIL_ALREADY_REGISTERED")) {
    return {
      title: t("register.error.EMAIL_ALREADY_REGISTERED.title"),
      description: t("register.error.EMAIL_ALREADY_REGISTERED.message"),
      tone: "error",
      primary: { label: t("register.dialog.login"), onClick: actions.goToLogin },
      secondary: { label: t("register.dialog.changeEmail"), onClick: actions.closeDialog },
    };
  }
  if (isCode(error, "NIK_MISMATCH")) {
    // Ketidakcocokan bukan gangguan sementara: tidak ada tombol coba lagi (Figma G "Mismatch").
    return { title: t("register.error.NIK_MISMATCH.title"), description: t("register.error.NIK_MISMATCH.message"), tone: "error", primary: edit };
  }
  if (isCode(error, "NIK_VERIFICATION_UNAVAILABLE")) {
    return {
      title: t("register.error.NIK_VERIFICATION_UNAVAILABLE.title"),
      description: t("register.error.NIK_VERIFICATION_UNAVAILABLE.message"),
      tone: "error",
      primary: retry,
      secondary: edit,
    };
  }
  const description = isCode(error, "RATE_LIMITED")
    ? t("register.error.RATE_LIMITED.message", { seconds: retrySeconds(error) })
    : error.kind === "network"
      ? t("register.error.network.message")
      : t("register.error.failed.message");
  return {
    title: t("register.error.failed.title"),
    description,
    tone: "error",
    primary: retry,
    secondary: { label: t("register.dialog.close"), onClick: actions.closeDialog },
  };
}

function toDialog(state: Editing, actions: Actions): RegisterViewProps["dialog"] {
  if (!state.dialog) return undefined;
  const rows = [
    { label: t("register.dialog.email"), value: state.email.trim() },
    { label: t("register.dialog.nik"), value: state.nik },
  ];

  switch (state.dialog.kind) {
    case "review":
      return {
        title: t("register.dialog.review.title"),
        description: t("register.dialog.review.description"),
        dismissible: true,
        onClose: actions.closeDialog,
        rows,
        primary: { label: t("register.dialog.confirm"), onClick: actions.confirm },
        secondary: { label: t("register.dialog.edit"), onClick: actions.closeDialog },
      };
    case "submitting":
      // Satu permintaan, satu hasil: kedua tombol terkunci dan dialog tidak bisa ditutup (Figma "Busy state and race handling").
      return {
        title: t("register.dialog.review.title"),
        description: t("register.dialog.review.description"),
        dismissible: false,
        onClose: actions.closeDialog,
        rows,
        note: t("register.dialog.submittingNote"),
        tone: "info",
        primary: { label: t("register.dialog.submitting"), onClick: actions.confirm, disabled: true },
        secondary: { label: t("register.dialog.edit"), onClick: actions.closeDialog, disabled: true },
      };
    case "failed":
      return { ...toFailedDialog(state.dialog.error, actions), dismissible: true, onClose: actions.closeDialog };
  }
}

export function toRegisterViewProps({ state, actions }: RegisterViewModel): RegisterViewProps {
  const title = t("register.title");

  if (state.kind === "registered") {
    const waitSeconds = Math.ceil(state.resendInMs / 1000);
    const resendLabel = state.resending
      ? t("register.registered.resending")
      : waitSeconds > 0
        ? t("register.registered.resendWait", { seconds: waitSeconds })
        : t("register.registered.resend");
    const resent = state.mode === "resend";
    return {
      title,
      ...(state.error && {
        notice: {
          tone: "error" as const,
          message: isCode(state.error, "RATE_LIMITED")
            ? t("register.error.RATE_LIMITED.message", { seconds: retrySeconds(state.error) })
            : t("register.error.failed.message"),
        },
      }),
      content: {
        kind: "registered",
        heading: resent ? t("register.resent.heading") : t("register.registered.heading"),
        message: t(resent ? "register.resent.message" : "register.registered.message", { email: state.sent.email }),
        steps: [t("register.registered.step1"), t("register.registered.step2"), t("register.registered.step3")],
        resend: { label: resendLabel, onClick: actions.resend, disabled: state.resending || waitSeconds > 0 },
        goToLogin: { label: t("register.registered.login"), href: "/login" },
        note: t("register.registered.note"),
        ...(state.simulation && {
          mockOpenLink: { label: t("register.mock.openLink"), onClick: actions.simulateOpenLink, disabled: state.simulation.busy },
        }),
      },
    };
  }

  const resendMode = state.mode === "resend";
  const dialog = toDialog(state, actions);
  return {
    title,
    ...(state.error && {
      notice: {
        tone: "error" as const,
        message: isCode(state.error, "RATE_LIMITED")
          ? t("register.error.RATE_LIMITED.message", { seconds: retrySeconds(state.error) })
          : t("register.error.failed.message"),
      },
    }),
    content: {
      kind: "form",
      heading: resendMode ? t("register.resend.heading") : t("register.form.heading"),
      intro: resendMode ? t("register.resend.intro") : t("register.form.intro"),
      email: {
        label: t("login.email.label"),
        value: state.email,
        placeholder: t("login.email.placeholder"),
        hint: t("register.email.hint"),
        ...(state.problems.email && { error: t(EMAIL_PROBLEM[state.problems.email]) }),
        onChange: actions.changeEmail,
      },
      ...(!resendMode && {
        nik: {
          label: t("register.nik.label"),
          value: state.nik,
          placeholder: t("register.nik.placeholder"),
          hint: t("register.nik.hint"),
          counter: t("register.nik.counter", { count: state.nik.length }),
          ...(state.problems.nik && { error: t(NIK_PROBLEM[state.problems.nik]) }),
          onChange: actions.changeNik,
        },
        note: t("register.note"),
      }),
      review: {
        label: resendMode ? (state.submitting ? t("register.registered.resending") : t("register.resend.submit")) : t("register.review"),
        onClick: actions.submit,
        disabled: state.submitting,
      },
      onSubmit: actions.submit,
      footer: { text: t("register.footer.text"), link: { label: t("register.footer.link"), href: "/login" } },
    },
    ...(dialog && { dialog }),
  };
}
