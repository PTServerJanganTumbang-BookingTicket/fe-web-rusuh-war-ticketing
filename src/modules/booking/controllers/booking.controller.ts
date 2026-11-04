"use client";

// Detail Ticket. Requirement: FR-11–19, BR-01–04, BR-07. ADR-0005 (timer), ADR-0011 (NIK).
// Desain: "Pilih tempatmu di konser." (langkah 1 dari 3). Submit membuat booking lalu ke halaman pembayaran.

import { useEffect, useReducer, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { CoreDependencies } from "@/core/application/core.dependencies";
import { toAppError, type AppError } from "@/core/domain/app-error";
import { serverOffsetMs } from "@/core/domain/time/remaining-ms.utils";
import { useDependencies } from "@/core/controllers/dependencies.context";
import { useAskServerAtExpiry } from "@/core/controllers/ask-server-at-expiry.hook";
import { useCountdown } from "@/core/controllers/countdown.hook";
import { toSiteChrome } from "@/core/controllers/site-chrome.utils";
import { t, type MessageKey } from "@/core/i18n/t.utils";
import type { StatusViewProps } from "@/components/ui/layout/StatusView";
import type { BookingDependencies } from "../application/booking.dependencies";
import { TERMS_VERSION } from "../domain/booking.constants";
import { selectionReducer } from "../domain/selection.reducer";
import { isNikFormat, ticketSlots } from "../domain/ticket-slots.rules";
import { bookingEventQuery, bookingSessionQuery } from "./booking.queries";
import { isBookingFormValid, toBookingViewProps, type NikCheckState } from "./booking.mapper";
import type { BookingViewProps } from "../views/BookingView";

export type BookingScreen =
  { kind: "ready"; view: BookingViewProps } | { kind: "status"; view: StatusViewProps };

function errorKey(error: AppError): MessageKey {
  if (error.kind === "network") return "booking.error.network";
  if (error.kind === "api") {
    if (error.code === "ACCESS_EXPIRED") return "booking.error.ACCESS_EXPIRED";
    if (error.code === "QUEUE_TOKEN_INVALID") return "booking.error.QUEUE_TOKEN_INVALID";
    if (error.code === "BOOKING_REJECTED") return "booking.error.BOOKING_REJECTED";
    if (error.code === "BOOKING_INVALID") return "booking.error.BOOKING_INVALID";
  }
  return "booking.error.unknown";
}

export function useBookingController(eventId: string): BookingScreen {
  const router = useRouter();
  const {
    getBookingSessionUseCase,
    getBookingEventUseCase,
    validateNikUseCase,
    submitBookingUseCase,
    random,
    appConfig,
  } = useDependencies<BookingDependencies & CoreDependencies>();
  const query = useQuery(bookingSessionQuery({ getBookingSessionUseCase, random }, eventId));
  // Detail event hanya pelengkap kartu samping; gagal memuatnya tidak menghentikan pemesanan.
  const event = useQuery(bookingEventQuery({ getBookingEventUseCase }, eventId));
  const [selection, dispatch] = useReducer(selectionReducer, {});
  const [buyerName, setBuyerName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [niks, setNiks] = useState<Record<string, string>>({});
  const [checks, setChecks] = useState<Record<string, NikCheckState>>({});
  const [touched, setTouched] = useState<ReadonlySet<string>>(new Set());
  const [submitted, setSubmitted] = useState(false);
  const session = query.data;

  const submit = useMutation({
    mutationFn: submitBookingUseCase,
    onSuccess: ({ bookingId }) => router.push(`/orders/${encodeURIComponent(bookingId)}/pay`),
  });

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

  const form = { buyerName, contactEmail, niks, checks, touched, submitted };
  const touch = (field: string) => setTouched((current) => new Set(current).add(field));

  // NIK dicek ke Dukcapil saat field ditinggalkan; hasil untuk NIK yang sudah diganti diabaikan.
  const checkNik = (slotKey: string) => {
    touch(`nik:${slotKey}`);
    const nik = niks[slotKey] ?? "";
    if (!isNikFormat(nik) || checks[slotKey]?.nik === nik) return;
    setChecks((current) => ({ ...current, [slotKey]: { nik, state: "checking" } }));
    validateNikUseCase(nik).then(
      (result) => setChecks((current) => ({ ...current, [slotKey]: { nik, state: "done", result } })),
      () => setChecks((current) => ({ ...current, [slotKey]: { nik, state: "failed" } })),
    );
  };

  return {
    kind: "ready",
    view: toBookingViewProps({
      chrome: toSiteChrome(),
      eventId,
      session,
      event: event.data,
      selection,
      remainingMs,
      form,
      submitting: submit.isPending,
      error: submit.isError ? t(errorKey(toAppError(submit.error))) : undefined,
      onAdd: (categoryId) =>
        dispatch({
          type: "ADD_TICKET",
          categoryId,
          stock: Object.fromEntries(session.categories.map((category) => [category.id, category.stock])),
          activeBooked: session.quota.used,
        }),
      onRemove: (categoryId) => dispatch({ type: "REMOVE_TICKET", categoryId }),
      onBuyerName: setBuyerName,
      onContactEmail: setContactEmail,
      // Hanya digit: spasi atau tanda baca dari salinan KTP dibuang, panjang divalidasi.
      onNik: (slotKey, value) => setNiks((current) => ({ ...current, [slotKey]: value.replace(/\D/g, "") })),
      onNikBlur: checkNik,
      onFieldBlur: touch,
      onSubmit: () => {
        setSubmitted(true);
        const slots = ticketSlots(selection, session.categories);
        if (
          !isBookingFormValid(
            form,
            slots.map((slot) => slot.key),
          )
        )
          return;
        submit.mutate({
          eventId,
          contactEmail,
          termsVersion: TERMS_VERSION,
          tickets: slots.map((slot) => ({ categoryId: slot.categoryId, nik: niks[slot.key] ?? "" })),
        });
      },
    }),
  };
}
