import type { AppError } from "@rusuh/core";
import { t, type MessageKey } from "@rusuh/i18n";
import type { StatusViewProps } from "@rusuh/ui";
import type { AuthCallbackViewModel } from "./useAuthCallbackViewModel";

function errorKey(error: AppError): MessageKey {
  if (error.kind === "network") return "auth.callback.failed.network";
  if (error.kind === "api" && error.code === "LOGIN_LINK_INVALID") return "auth.callback.failed.LOGIN_LINK_INVALID";
  return "auth.callback.failed.unknown";
}

export function toAuthCallbackViewProps({ state, actions }: AuthCallbackViewModel): StatusViewProps {
  if (state.kind === "redeeming") return { title: t("login.title"), message: t("auth.callback.redeeming"), tone: "neutral" };
  return {
    title: t("auth.callback.failed.title"),
    message: t(errorKey(state.error)),
    tone: "error",
    action: { label: t("auth.callback.newLink"), onClick: actions.requestNewLink },
  };
}
