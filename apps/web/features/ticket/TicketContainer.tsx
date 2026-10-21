import { t } from "@rusuh/i18n";
import { ScreenPlaceholder } from "@rusuh/ui";

// Placeholder: ViewModel dan View menyusul (skill new-feature-screen).
export function TicketContainer() {
  return <ScreenPlaceholder title={t("ticket.title")} description={t("common.placeholder")} />;
}
