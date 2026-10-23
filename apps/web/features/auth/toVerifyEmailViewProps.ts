import type { AppError } from "@rusuh/core";
import { t, type MessageKey } from "@rusuh/i18n";
import type { StatusViewProps } from "@rusuh/ui";
import type { VerifyEmailViewModel } from "./useVerifyEmailViewModel";

function errorKey(error: AppError): MessageKey {
  if (error.kind === "network") return "verify.failed.network";
  if (error.kind === "api" && error.code === "VERIFICATION_LINK_INVALID") return "verify.failed.VERIFICATION_LINK_INVALID";
  return "verify.failed.unknown";
}

export function toVerifyEmailViewProps({ state, actions }: VerifyEmailViewModel): StatusViewProps {
  switch (state.kind) {
    case "verifying":
      return { title: t("verify.title"), message: t("verify.verifying"), tone: "neutral" };
    case "verified":
      return { title: t("verify.done.title"), message: t("verify.done.message"), tone: "neutral", action: { label: t("verify.done.cta"), onClick: actions.goToLogin } };
    case "failed":
      return {
        title: t("verify.failed.title"),
        message: t(errorKey(state.error)),
        tone: "error",
        action: { label: t("verify.failed.cta"), onClick: actions.requestNewEmail },
      };
  }
}
