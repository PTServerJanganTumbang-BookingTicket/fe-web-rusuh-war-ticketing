"use client";

// Detail Ticket. Requirement: FR-11–19, BR-01–04, BR-07. Wireframe 9.3. ADR-0005 (timer), ADR-0011 (NIK dan kuota).

import { useEffect, useReducer } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import type { CoreDependencies } from "@/core/application/dependencies";
import { toAppError, type AppError } from "@/core/domain/errors/appError";
import { serverOffsetMs } from "@/core/domain/time/remainingMs";
import { useCradle } from "@/ui/di/DependencyContext";
import { useAskServerAtExpiry } from "@/ui/hooks/useAskServerAtExpiry";
import { useCountdown } from "@/ui/hooks/useCountdown";
import { t, type MessageKey } from "@/ui/i18n/t";
import type { StatusViewProps } from "@/ui/design-system/layout/StatusView";
import type { BookingDependencies } from "../application/dependencies";
import { selectionReducer } from "../domain/selection";
import { bookingSessionQuery } from "./bookingQueries";
import { toBookingViewProps } from "./toBookingViewProps";
import type { BookingViewProps } from "./views/BookingView";

export type BookingScreen =
  { kind: "ready"; view: BookingViewProps } | { kind: "status"; view: StatusViewProps };

function errorKey(error: AppError): MessageKey {
  if (error.kind === "network") return "booking.error.network";
  if (error.kind === "api" && error.code === "ACCESS_EXPIRED") return "booking.error.ACCESS_EXPIRED";
  if (error.kind === "api" && error.code === "QUEUE_TOKEN_INVALID")
    return "booking.error.QUEUE_TOKEN_INVALID";
  return "booking.error.unknown";
}

export function useBookingViewModel(eventId: string): BookingScreen {
  const router = useRouter();
  const { getBookingSession, random, appConfig } = useCradle<BookingDependencies & CoreDependencies>();
  const query = useQuery(bookingSessionQuery({ getBookingSession, random }, eventId));
  const [selection, dispatch] = useReducer(selectionReducer, {});
  const session = query.data;

  const offsetMs = session ? serverOffsetMs(Date.parse(session.serverNow), query.dataUpdatedAt) : 0;
  const remainingMs = useCountdown(session?.expiresAt, offsetMs);

  useAskServerAtExpiry(session?.expiresAt, remainingMs, query.refetch);

  const queuePath = `/events/${eventId}/queue`;
  const isExpired =
    query.isError &&
    (() => {
      const error = toAppError(query.error);
      return error.kind === "api" && error.code === "ACCESS_EXPIRED";
    })();
  // Keduanya hanya setelah server menjawab ACCESS_EXPIRED (ADR-0005); mode dari konfigurasi.
  const redirectToQueue = isExpired && appConfig.bookingExpiry === "queue";
  useEffect(() => {
    if (redirectToQueue) router.replace(queuePath);
  }, [redirectToQueue, router, queuePath]);

  if (redirectToQueue) {
    return {
      kind: "status",
      view: { title: t("booking.expired.title"), message: t("booking.expired.redirecting"), tone: "neutral" },
    };
  }

  if (isExpired) {
    return {
      kind: "status",
      view: {
        title: t("booking.expired.title"),
        message: t("booking.error.ACCESS_EXPIRED"),
        tone: "error",
        action: { label: t("booking.expired.cta"), onClick: () => router.push(queuePath) },
      },
    };
  }

  if (query.isError && !session) {
    return {
      kind: "status",
      view: { title: t("booking.error.title"), message: t(errorKey(toAppError(query.error))), tone: "error" },
    };
  }

  if (!session || remainingMs === null) {
    return {
      kind: "status",
      view: { title: t("booking.title"), message: t("booking.loading"), tone: "neutral" },
    };
  }

  return {
    kind: "ready",
    view: toBookingViewProps({
      session,
      selection,
      remainingMs,
      onAdd: (categoryId) =>
        dispatch({
          type: "ADD_TICKET",
          categoryId,
          stock: Object.fromEntries(session.categories.map((category) => [category.id, category.stock])),
          activeBooked: session.quota.used,
        }),
      onRemove: (categoryId) => dispatch({ type: "REMOVE_TICKET", categoryId }),
      // Dummy: endpoint pembuatan booking belum ada, langsung ke halaman payment placeholder.
      onSubmit: () => router.push("/orders/RB-00912/pay"),
    }),
  };
}
