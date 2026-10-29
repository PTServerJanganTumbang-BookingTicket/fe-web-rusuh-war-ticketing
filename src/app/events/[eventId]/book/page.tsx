import { Suspense } from "react";
import { BookingContainer } from "@/modules/booking/views/BookingContainer";
import { ScreenLoading } from "@/core/views/ScreenLoading";

export default function BookingPage({ params }: PageProps<"/events/[eventId]/book">) {
  return (
    <Suspense fallback={<ScreenLoading />}>
      <Booking params={params} />
    </Suspense>
  );
}

async function Booking({ params }: Pick<PageProps<"/events/[eventId]/book">, "params">) {
  const { eventId } = await params;
  return <BookingContainer eventId={eventId} />;
}
