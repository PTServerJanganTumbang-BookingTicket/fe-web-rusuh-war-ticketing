"use client";

import { BookingView, StatusView } from "@rusuh/ui";
import { useBookingViewModel } from "./useBookingViewModel";

export function BookingContainer({ eventId }: { eventId: string }) {
  const screen = useBookingViewModel(eventId);
  return screen.kind === "ready" ? <BookingView {...screen.view} /> : <StatusView {...screen.view} />;
}
