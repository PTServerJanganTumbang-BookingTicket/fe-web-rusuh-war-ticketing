"use client";

// Detail Ticket. Requirement: FR-11–19, BR-01–04, BR-07. ADR-0005 (timer), ADR-0011 (NIK).
// Desain: "Pilih tempatmu di konser." (langkah 1 dari 3). Submit membuat booking lalu ke halaman pembayaran.
// Customer yang masuk bisa memilih alias dari profil sebagai pemegang tiket; NIK manual tetap tersedia.

import { useEffect, useReducer, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { CoreDependencies } from "@/core/application/core.dependencies";
import { toAppError, type AppError } from "@/core/domain/app-error";
import { serverOffsetMs } from "@/core/domain/time/remaining-ms.utils";
import { useDependencies } from "@/core/controllers/dependencies.context";
import { useAskServerAtExpiry } from "@/core/controllers/ask-server-at-expiry.hook";
import { useCountdown } from "@/core/controllers/countdown.hook";
import { useSiteChrome } from "@/core/controllers/site-chrome.hook";
import { useModal, type ActionDialogModel } from "@/core/controllers/modal.hook";
import {
  toNikMismatchDialog,
  toNikUnavailableDialog,
  type NikDialogKind,
} from "@/core/controllers/nik-dialog.mapper";
import { isUnexpectedError, toRequestFailedDialog } from "@/core/controllers/common-dialogs.mapper";
import type { SubmitBookingInput } from "../domain/booking-request.model";
import { t, type MessageKey } from "@/core/i18n/t.utils";
import type { StatusViewProps } from "@/components/ui/layout/StatusView";
import type { BookingDependencies } from "../application/booking.dependencies";
import { TERMS_VERSION } from "../domain/booking.constants";
import { selectionReducer } from "../domain/selection.reducer";
import { isNikFormat, ticketSlots } from "../domain/ticket-slots.rules";
import { bookingEventQuery, bookingSessionQuery, holderAliasesQuery } from "./booking.queries";
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
  const siteChrome = useSiteChrome();
  // Dukcapil tidak menjawab atau menolak NIK satu tiket: modal menyebut tiket mana lewat `slotKey`.
  // Satu modal per layar: NIK satu tiket, atau submit gagal tanpa respons yang dikenali (bisa dicoba lagi).
  const nikModal = useModal<
    { kind: NikDialogKind; slotKey: string } | { kind: "submitFailed"; input: SubmitBookingInput }
  >();
  /** Fokus kembali ke field NIK setelah "Ubah data"; `n` berubah tiap permintaan supaya fokus terulang. */
  const [focusNik, setFocusNik] = useState<{ slotKey: string; n: number } | null>(null);
  const router = useRouter();
  const {
    getBookingSessionUseCase,
    getBookingEventUseCase,
    validateNikUseCase,
    submitBookingUseCase,
    listHolderAliasesUseCase,
    random,
    appConfig,
  } = useDependencies<BookingDependencies & CoreDependencies>();
  const query = useQuery(bookingSessionQuery({ getBookingSessionUseCase, random }, eventId));
  // Detail event hanya pelengkap kartu samping; gagal memuatnya tidak menghentikan pemesanan.
  const event = useQuery(bookingEventQuery({ getBookingEventUseCase }, eventId));
  // Gagal memuat alias (tamu, atau BE belum mengirim NIK lengkap) hanya berarti isian manual.
  const aliases = useQuery(holderAliasesQuery({ listHolderAliasesUseCase }));
  const [selection, dispatch] = useReducer(selectionReducer, {});
  const [buyerName, setBuyerName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [niks, setNiks] = useState<Record<string, string>>({});
  /** Slot yang pemegangnya dipilih dari alias: kunci slot → id alias. */
  const [aliasPicks, setAliasPicks] = useState<Record<string, string>>({});
  const [checks, setChecks] = useState<Record<string, NikCheckState>>({});
  const [touched, setTouched] = useState<ReadonlySet<string>>(new Set());
  const [submitted, setSubmitted] = useState(false);
  const session = query.data;

  const submit = useMutation({
    mutationFn: submitBookingUseCase,
    onSuccess: ({ bookingId }) => router.push(`/orders/${encodeURIComponent(bookingId)}/pay`),
    // Stok, NIK ditolak, atau grant habis tetap di layar; koneksi dan galat server jadi dialog dengan coba lagi.
    onError: (failure, input) => {
      if (isUnexpectedError(toAppError(failure))) nikModal.open({ kind: "submitFailed", input });
    },
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
      view: {
        ...siteChrome,
        title: t("booking.expired.title"),
        message: t("booking.expired.redirecting"),
        tone: "neutral",
      },
    };
  }

  if (isExpired) {
    return {
      kind: "status",
      view: {
        ...siteChrome,
        title: t("booking.expired.title"),
        message: t("booking.error.ACCESS_EXPIRED"),
        // Waktu habis bukan galat customer: nada peringatan seperti dialog "Sesi berakhir".
        tone: "warning",
        action: { label: t("booking.expired.cta"), onClick: () => router.push(queuePath) },
      },
    };
  }

  if (query.isError && !session) {
    return {
      kind: "status",
      view: {
        ...siteChrome,
        title: t("booking.error.title"),
        message: t(errorKey(toAppError(query.error))),
        tone: "error",
      },
    };
  }

  if (!session || remainingMs === null) {
    return {
      kind: "status",
      view: {
        ...siteChrome,
        title: t("booking.title"),
        message: t("booking.loading"),
        tone: "neutral",
        skeleton: "checkout",
      },
    };
  }

  const form = { buyerName, contactEmail, niks, aliasPicks, checks, touched, submitted };
  const touch = (field: string) => setTouched((current) => new Set(current).add(field));

  // NIK dicek ke Dukcapil saat field ditinggalkan; hasil untuk NIK yang sudah diganti diabaikan.
  // Tidak cocok atau nonaktif membuka modal "Periksa NIK"; tanpa jawaban membuka modal "Verifikasi belum tersedia"
  // tanpa menyebut NIK salah. `force` dipakai tombol coba lagi untuk NIK yang sama.
  const checkNik = (slotKey: string, nik: string = niks[slotKey] ?? "", force = false) => {
    touch(`nik:${slotKey}`);
    if (!isNikFormat(nik) || (!force && checks[slotKey]?.nik === nik)) return;
    setChecks((current) => ({ ...current, [slotKey]: { nik, state: "checking" } }));
    validateNikUseCase(nik).then(
      (result) => {
        setChecks((current) => ({ ...current, [slotKey]: { nik, state: "done", result } }));
        if (result.status === "not_found" || result.status === "inactive")
          nikModal.open({ kind: "mismatch", slotKey });
        else if (nikModal.modal && "slotKey" in nikModal.modal && nikModal.modal.slotKey === slotKey)
          nikModal.close();
      },
      () => {
        setChecks((current) => ({ ...current, [slotKey]: { nik, state: "failed" } }));
        nikModal.open({ kind: "unavailable", slotKey });
      },
    );
  };

  // "Ubah data": tutup modal dan kembali ke field NIK dengan isian yang ada. NIK alias tidak bisa diketik, jadi
  // slot itu kembali ke isian manual yang kosong.
  const editNik = (slotKey: string) => {
    nikModal.close();
    if (aliasPicks[slotKey]) {
      setAliasPicks((current) => {
        const next = { ...current };
        delete next[slotKey];
        return next;
      });
      setNiks((current) => ({ ...current, [slotKey]: "" }));
    }
    setFocusNik((current) => ({ slotKey, n: (current?.n ?? 0) + 1 }));
  };

  let dialog: ActionDialogModel | undefined;
  const open = nikModal.modal;
  if (open?.kind === "mismatch") {
    dialog = toNikMismatchDialog({ onEdit: () => editNik(open.slotKey), onDismiss: nikModal.close });
  } else if (open?.kind === "unavailable") {
    dialog = toNikUnavailableDialog({
      onRetry: () => checkNik(open.slotKey, niks[open.slotKey] ?? "", true),
      onEdit: () => editNik(open.slotKey),
      onDismiss: nikModal.close,
      retrying: checks[open.slotKey]?.state === "checking",
    });
  } else if (open?.kind === "submitFailed" && submit.error) {
    dialog = toRequestFailedDialog(toAppError(submit.error), {
      onRetry: () => submit.mutate(open.input),
      onDismiss: nikModal.close,
      retrying: submit.isPending,
    });
  }

  return {
    kind: "ready",
    view: toBookingViewProps({
      chrome: siteChrome,
      eventId,
      session,
      event: event.data,
      selection,
      remainingMs,
      form,
      submitting: submit.isPending,
      dialog,
      focusNik,
      error:
        submit.isError && !isUnexpectedError(toAppError(submit.error))
          ? t(errorKey(toAppError(submit.error)))
          : undefined,
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
      onNikBlur: (slotKey) => checkNik(slotKey),
      aliases: aliases.data ?? [],
      // Memilih alias mengisi NIK slot itu; "isi manual" mengosongkan NIK supaya tidak terkirim tanpa sengaja.
      onHolderAlias: (slotKey, aliasId) => {
        const alias = aliases.data?.find((item) => item.id === aliasId);
        setAliasPicks((current) => {
          const next = { ...current };
          if (alias) next[slotKey] = alias.id;
          else delete next[slotKey];
          return next;
        });
        setNiks((current) => ({ ...current, [slotKey]: alias?.nik ?? "" }));
        if (alias) checkNik(slotKey, alias.nik);
      },
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
