import { Suspense } from "react";
import { QueueContainer } from "@/features/queue/QueueContainer";
import { ScreenLoading } from "@/features/shared/ScreenLoading";

export default function QueuePage({ params }: PageProps<"/events/[eventId]/queue">) {
  return (
    <Suspense fallback={<ScreenLoading />}>
      <Queue params={params} />
    </Suspense>
  );
}

async function Queue({ params }: Pick<PageProps<"/events/[eventId]/queue">, "params">) {
  const { eventId } = await params;
  return <QueueContainer eventId={eventId} />;
}
