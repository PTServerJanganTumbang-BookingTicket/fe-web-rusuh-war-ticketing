import { t } from "@/ui/i18n/t";
import { ScreenPlaceholder } from "@/ui/design-system/layout/ScreenPlaceholder";

// Placeholder: ViewModel dan View menyusul (skill new-feature-screen).
export function LoginContainer() {
  return <ScreenPlaceholder title={t("login.title")} description={t("common.placeholder")} />;
}
