import { t } from "@rusuh/i18n";
import { ScreenPlaceholder } from "@rusuh/ui";

// Placeholder: ViewModel dan View menyusul (skill new-feature-screen).
export function LoginContainer() {
  return <ScreenPlaceholder title={t("login.title")} description={t("common.placeholder")} />;
}
