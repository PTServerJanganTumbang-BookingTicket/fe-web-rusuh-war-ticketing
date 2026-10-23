import { Suspense } from "react";
import { BookingContainer } from "@/features/booking/BookingContainer";
import { ScreenLoading } from "@/features/shared/ScreenLoading";

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
