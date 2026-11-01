import { t } from "@/core/i18n/t.utils";
import { ScreenPlaceholder } from "@/components/ui/layout/ScreenPlaceholder";

export function ScreenLoading() {
  return <ScreenPlaceholder title={t("common.loading")} description="" />;
}
