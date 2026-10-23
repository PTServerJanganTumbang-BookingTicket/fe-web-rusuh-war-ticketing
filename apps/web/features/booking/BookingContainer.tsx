"use client";

import { BookingView, StatusView } from "@rusuh/ui";
import { toBookingViewProps } from "./toBookingViewProps";
import { useBookingViewModel } from "./useBookingViewModel";

export function BookingContainer({ eventId }: { eventId: string }) {
  const screen = toBookingViewProps(useBookingViewModel(eventId));
  return screen.kind === "ready" ? <BookingView {...screen.view} /> : <StatusView {...screen.view} />;
}
