"use client";

import { StatusView } from "@/components/ui/layout/StatusView";
import { useBookingController } from "../controllers/booking.controller";
import { BookingView } from "./BookingView";

export function BookingContainer({ eventId }: { eventId: string }) {
  const screen = useBookingController(eventId);
  return screen.kind === "ready" ? <BookingView {...screen.view} /> : <StatusView {...screen.view} />;
}
