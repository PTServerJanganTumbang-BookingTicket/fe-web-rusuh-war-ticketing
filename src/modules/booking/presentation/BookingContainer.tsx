"use client";

import { StatusView } from "@/ui/design-system/layout/StatusView";
import { useBookingViewModel } from "./useBookingViewModel";
import { BookingView } from "./views/BookingView";

export function BookingContainer({ eventId }: { eventId: string }) {
  const screen = useBookingViewModel(eventId);
  return screen.kind === "ready" ? <BookingView {...screen.view} /> : <StatusView {...screen.view} />;
}
