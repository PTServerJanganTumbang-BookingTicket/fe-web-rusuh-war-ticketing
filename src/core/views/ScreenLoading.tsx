import { t } from "@/core/i18n/t.utils";
import { StatusView } from "@/components/ui/layout/StatusView";

/** Fallback Suspense dan render pertama: header merek dan spinner, tanpa menu (status masuk belum diketahui). */
export function ScreenLoading() {
  return <StatusView tone="neutral" title={t("common.loading")} />;
}
