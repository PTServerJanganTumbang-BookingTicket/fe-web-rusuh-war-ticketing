"use client";

// Detail Ticket. Requirement: FR-11–19, BR-01–04, BR-07. Wireframe 9.3. ADR-0005 (timer), ADR-0011 (NIK dan kuota), ADR-0017 (screen model).

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { bookingSessionQuery } from "@rusuh/api";
import { addTicket, removeTicket, serverOffsetMs, toAppError, type Selection } from "@rusuh/core";
import { useAskServerAtExpiry } from "../shared/useAskServerAtExpiry";
import { useCountdown } from "../shared/useCountdown";
import { deriveBookingScreenState, type BookingExpiryMode, type BookingScreenState } from "./bookingModel";

// Toggle uji: NEXT_PUBLIC_BOOKING_EXPIRY=screen menampilkan layar sesi berakhir, selain itu (default)
// langsung mengembalikan ke ruang tunggu. Keduanya hanya setelah server menjawab ACCESS_EXPIRED (ADR-0005).
const expiryMode: BookingExpiryMode = process.env.NEXT_PUBLIC_BOOKING_EXPIRY === "screen" ? "screen" : "queue";

export type BookingViewModel = {
  state: BookingScreenState;
  actions: {
    add: (categoryId: string) => void;
    remove: (categoryId: string) => void;
    submit: () => void;
    backToQueue: () => void;
  };
};

export function useBookingViewModel(eventId: string): BookingViewModel {
  const router = useRouter();
  const query = useQuery(bookingSessionQuery(eventId));
  const [selection, setSelection] = useState<Selection>({});
  const session = query.data;

  const offsetMs = session ? serverOffsetMs(Date.parse(session.serverNow), query.dataUpdatedAt) : 0;
  const remainingMs = useCountdown(session?.expiresAt, offsetMs);
  useAskServerAtExpiry(session?.expiresAt, remainingMs, query.refetch);

  const state = deriveBookingScreenState({
    session,
    error: query.isError ? toAppError(query.error) : undefined,
    selection,
    remainingMs,
    expiryMode,
  });

  const queuePath = `/events/${eventId}/queue`;
  const redirectToQueue = state.kind === "expired" && state.next === "redirect";
  useEffect(() => {
    if (redirectToQueue) router.replace(queuePath);
  }, [redirectToQueue, router, queuePath]);

  return {
    state,
    actions: {
      add: (categoryId) => {
        if (session) setSelection((current) => addTicket(session, current, categoryId));
      },
      remove: (categoryId) => setSelection((current) => removeTicket(current, categoryId)),
      // Dummy: endpoint pembuatan booking belum ada, langsung ke halaman payment placeholder (tahap 6 rencana implementasi).
      submit: () => router.push("/orders/RB-00912/pay"),
      backToQueue: () => router.push(queuePath),
    },
  };
}
