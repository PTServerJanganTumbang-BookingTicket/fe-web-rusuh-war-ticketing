/**
 * Detail event. Shell statis; data diambil klien dengan polling supaya stok dan status jual tetap segar (ADR-0007).
 * `params` dibaca di dalam Suspense (Cache Components). Tidak dijaga `proxy.ts`: halaman ini publik.
 */

import { Suspense } from "react";
import { EventDetailContainer } from "@/modules/catalog/views/EventDetailContainer";
import { ScreenLoading } from "@/components/ui/layout/PageSkeleton";
import { t } from "@/core/i18n/t.utils";

export default function EventDetailPage({ params }: PageProps<"/events/[eventId]">) {
  return (
    <Suspense fallback={<ScreenLoading label={t("common.loading")} variant="page" />}>
      <EventDetail params={params} />
    </Suspense>
  );
}

async function EventDetail({ params }: Pick<PageProps<"/events/[eventId]">, "params">) {
  const { eventId } = await params;
  return <EventDetailContainer eventId={eventId} />;
}
