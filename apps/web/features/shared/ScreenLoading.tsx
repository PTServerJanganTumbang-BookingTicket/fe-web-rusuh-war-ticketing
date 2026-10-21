import { ScreenPlaceholder } from "@rusuh/ui";
import { t } from "@rusuh/i18n";

export function ScreenLoading() {
  return <ScreenPlaceholder title={t("common.loading")} description="" />;
}
