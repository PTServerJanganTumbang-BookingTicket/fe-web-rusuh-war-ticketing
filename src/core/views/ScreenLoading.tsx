import { t } from "@/core/i18n/t.utils";
import { ScreenPlaceholder } from "./design-system/layout/ScreenPlaceholder";

export function ScreenLoading() {
  return <ScreenPlaceholder title={t("common.loading")} description="" />;
}
