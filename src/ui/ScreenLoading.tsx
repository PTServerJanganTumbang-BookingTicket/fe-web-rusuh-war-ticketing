import { t } from "./i18n/t";
import { ScreenPlaceholder } from "./design-system/layout/ScreenPlaceholder";

export function ScreenLoading() {
  return <ScreenPlaceholder title={t("common.loading")} description="" />;
}
