import { t, type MessageKey } from "@rusuh/i18n";
import { ScreenPlaceholder } from "@rusuh/ui";

// Layar yang sudah punya tautan di navbar tetapi belum dibangun (skill new-feature-screen menyusul).
export function PlaceholderContainer({ titleKey }: { titleKey: MessageKey }) {
  return <ScreenPlaceholder title={t(titleKey)} description={t("common.placeholder")} />;
}
