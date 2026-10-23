import type { AppError, EmailProblem } from "@rusuh/core";
import { t } from "@rusuh/i18n";
import type { LoginViewProps } from "@rusuh/ui";
import type { LoginViewModel } from "./useLoginViewModel";

const PROBLEM_KEY = { required: "login.email.required", invalid: "login.email.invalid" } as const satisfies Record<EmailProblem, string>;

function errorMessage(error: AppError): string {
  if (error.kind === "network") return t("login.error.network");
  if (error.kind === "api" && error.code === "RATE_LIMITED") {
    return t("login.error.RATE_LIMITED", { seconds: Math.ceil((error.retryAfterMs ?? 30_000) / 1000) });
  }
  return t("login.error.unknown");
}

export function toLoginViewProps({ state, actions }: LoginViewModel): LoginViewProps {
  const title = t("login.title");
  switch (state.kind) {
    case "checking":
      return { title, content: { kind: "loading", message: t("login.checking") } };

    case "signedIn":
      return {
        title,
        content: {
          kind: "signedIn",
          heading: t("login.signedIn.heading"),
          message: t("login.signedIn.message", { email: state.account.email }),
          proceed: { label: t("login.proceed"), onClick: actions.proceed },
          logout: { label: state.loggingOut ? t("login.loggingOut") : t("login.logout"), onClick: actions.logout, disabled: state.loggingOut },
        },
      };

    case "editing": {
      const notice = state.error
        ? { tone: "error" as const, message: errorMessage(state.error) }
        : state.reason
          ? { tone: state.reason === "revoked" ? ("warning" as const) : ("info" as const), message: t(`login.reason.${state.reason}`) }
          : undefined;
      return {
        title,
        ...(notice && { notice }),
        content: {
          kind: "form",
          heading: t("login.form.heading"),
          intro: t("login.form.intro"),
          email: {
            label: t("login.email.label"),
            value: state.email,
            placeholder: t("login.email.placeholder"),
            hint: t("login.email.hint"),
            ...(state.problem && { error: t(PROBLEM_KEY[state.problem]) }),
            onChange: actions.changeEmail,
          },
          // Tombol tetap aktif saat field kosong: menekan memunculkan pesan "wajib diisi" (Figma: required on submit).
          submit: { label: state.submitting ? t("login.submitting") : t("login.submit"), onClick: actions.submit, disabled: state.submitting },
          onSubmit: actions.submit,
          footer: { text: t("login.footer.text"), link: { label: t("login.footer.link"), href: "/register" } },
        },
      };
    }

    case "sent": {
      const waitSeconds = Math.ceil(state.resendInMs / 1000);
      const resendLabel = state.resending ? t("login.resending") : waitSeconds > 0 ? t("login.resend.wait", { seconds: waitSeconds }) : t("login.resend");
      return {
        title,
        ...(state.error && { notice: { tone: "error" as const, message: errorMessage(state.error) } }),
        content: {
          kind: "sent",
          heading: t("login.sent.heading"),
          message: t("login.sent.message", { email: state.sent.email }),
          note: t("login.sent.note"),
          resend: { label: resendLabel, onClick: actions.resend, disabled: state.resending || waitSeconds > 0 },
          changeEmail: { label: t("login.changeEmail"), onClick: actions.editEmail },
          ...(state.simulation && {
            mockOpenLink: { label: t("login.mock.openLink"), onClick: actions.simulateOpenLink, disabled: state.simulation.busy },
          }),
        },
      };
    }
  }
}
