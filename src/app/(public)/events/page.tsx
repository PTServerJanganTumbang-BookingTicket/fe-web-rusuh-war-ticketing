/** Semua event dengan filter kategori dan cari di klien. Data sama dengan Home (polling, ADR-0007). */

import { Suspense } from "react";
import { AllEventsContainer } from "@/modules/catalog/views/AllEventsContainer";
import { ScreenLoading } from "@/components/ui/layout/PageSkeleton";
import { t } from "@/core/i18n/t.utils";

export default function AllEventsPage() {
  return (
    <Suspense fallback={<ScreenLoading label={t("common.loading")} variant="list" />}>
      <AllEventsContainer />
    </Suspense>
  );
}
