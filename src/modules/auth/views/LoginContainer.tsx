import { t } from "@/core/i18n/t.utils";
import { ScreenPlaceholder } from "@/core/views/design-system/layout/ScreenPlaceholder";

// Placeholder: Controller dan View menyusul (skill new-feature-screen).
export function LoginContainer() {
  return <ScreenPlaceholder title={t("login.title")} description={t("common.placeholder")} />;
}
