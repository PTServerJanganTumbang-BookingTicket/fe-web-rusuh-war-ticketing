import { Suspense } from "react";
import { BookingContainer } from "@/modules/booking/views/BookingContainer";
import { ScreenLoading } from "@/components/ui/layout/PageSkeleton";
import { t } from "@/core/i18n/t.utils";

export default function BookingPage({ params }: PageProps<"/events/[eventId]/book">) {
  return (
    <Suspense fallback={<ScreenLoading label={t("common.loading")} variant="checkout" />}>
      <Booking params={params} />
    </Suspense>
  );
}

async function Booking({ params }: Pick<PageProps<"/events/[eventId]/book">, "params">) {
  const { eventId } = await params;
  return <BookingContainer eventId={eventId} />;
}
