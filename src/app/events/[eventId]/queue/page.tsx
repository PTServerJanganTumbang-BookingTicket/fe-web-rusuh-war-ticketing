import { Suspense } from "react";
import { QueueContainer } from "@/modules/queue/views/QueueContainer";
import { ScreenLoading } from "@/components/ui/layout/PageSkeleton";
import { t } from "@/core/i18n/t.utils";

export default function QueuePage({ params }: PageProps<"/events/[eventId]/queue">) {
  return (
    <Suspense fallback={<ScreenLoading label={t("common.loading")} variant="queue" />}>
      <Queue params={params} />
    </Suspense>
  );
}

async function Queue({ params }: Pick<PageProps<"/events/[eventId]/queue">, "params">) {
  const { eventId } = await params;
  return <QueueContainer eventId={eventId} />;
}
