"use client";

// Detail Ticket. Requirement: FR-11–19, BR-01–04, BR-07. ADR-0005 (timer), ADR-0011 (NIK).
// Desain: "Pilih tempatmu di konser." (langkah 1 dari 3). Submit membuat booking lalu ke halaman pembayaran.
// Customer yang masuk bisa memilih NIK terdaftarnya atau entri Daftar NIK dari profil sebagai pemegang tiket
// (kontrak §4.3: `use_account_nik`, `saved_nik_id`); NIK yang diketik tetap tersedia dan dicek ke Dukcapil.

import { useCallback, useEffect, useMemo, useReducer, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { CoreDependencies } from "@/core/application/core.dependencies";
import { toAppError, type AppError } from "@/core/domain/app-error";
import { serverOffsetMs } from "@/core/domain/time/remaining-ms.utils";
import { NIK_LENGTH, sanitizeNikInput } from "@/core/domain/nik.utils";
import { useDependencies } from "@/core/controllers/dependencies.context";
import { useAutoRedirect } from "@/core/controllers/auto-redirect.hook";
import { sessionAccountQuery } from "@/core/controllers/session.queries";
import { useAskServerAtExpiry } from "@/core/controllers/ask-server-at-expiry.hook";
import { useOnceWhileActive } from "@/core/controllers/once-while-active.hook";
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
import { BOOKING_TIMEOUT_REDIRECT_SECONDS } from "../domain/booking.constants";
import { clearBookingDraft, loadBookingDraft, saveBookingDraft } from "./booking-draft.utils";
import { holderChoices, holderInputFor } from "../domain/ticket-holders.rules";
import { selectionReducer } from "../domain/selection.reducer";
import { isNikFormat, ticketSlots } from "../domain/ticket-slots.rules";
import { bookingEventQuery, bookingSessionQuery, holderAliasesQuery } from "./booking.queries";
import {
  isBookingFormValid,
  SOLD_OUT_REDIRECT_SECONDS,
  toBookingConfirmDialog,
  toBookingViewProps,
  toBookingTimeoutDialog,
  toStockUnavailableDialog,
  type NikCheckState,
} from "./booking.mapper";
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
    if (error.code === "UNAUTHENTICATED") return "booking.error.UNAUTHENTICATED";
  }
  return "booking.error.unknown";
}

export function useBookingController(eventId: string): BookingScreen {
  const siteChrome = useSiteChrome();
  // Dukcapil tidak menjawab atau menolak NIK satu tiket: modal menyebut tiket mana lewat `slotKey`.
  // Satu modal per layar: NIK satu tiket, atau submit gagal tanpa respons yang dikenali (bisa dicoba lagi).
  const nikModal = useModal<
    | { kind: NikDialogKind; slotKey: string }
    | { kind: "submitFailed"; input: SubmitBookingInput }
    | { kind: "confirm"; input: SubmitBookingInput }
    | { kind: "stock" }
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
    endSessionUseCase,
    getSessionAccountUseCase,
  } = useDependencies<BookingDependencies & CoreDependencies>();
  // Opsi dimemoisasi: jitter polling diundi sekali, jadi hitung mundur yang merender ulang tiap detik tidak
  // memasang ulang timer polling.
  const sessionOptions = useMemo(
    () => bookingSessionQuery({ getBookingSessionUseCase, random }, eventId),
    [getBookingSessionUseCase, random, eventId],
  );
  const query = useQuery(sessionOptions);
  // Detail event hanya pelengkap kartu samping; gagal memuatnya tidak menghentikan pemesanan.
  const event = useQuery(bookingEventQuery({ getBookingEventUseCase }, eventId));
  // Gagal memuat Daftar NIK (tamu mendapat 401) hanya berarti NIK diketik sendiri.
  // Customer yang masuk: email pemesan dari akun (tidak bisa diubah) dan NIK terdaftarnya jadi pilihan pemegang tiket.
  const account = useQuery(sessionAccountQuery({ getSessionAccountUseCase })).data ?? null;
  const aliases = useQuery(holderAliasesQuery({ listHolderAliasesUseCase }, Boolean(account)));
  const [selection, dispatch] = useReducer(selectionReducer, {});
  const [typedEmail, setContactEmail] = useState("");
  const contactEmail = account?.email ?? typedEmail;
  /** NIK yang diketik per slot. */
  const [niks, setNiks] = useState<Record<string, string>>({});
  /** Slot yang pemegangnya dipilih dari profil: kunci slot → id pilihan. */
  const [aliasPicks, setAliasPicks] = useState<Record<string, string>>({});
  const [checks, setChecks] = useState<Record<string, NikCheckState>>({});
  const [touched, setTouched] = useState<ReadonlySet<string>>(new Set());
  const [submitted, setSubmitted] = useState(false);
  const [stockSeconds, setStockSeconds] = useState(SOLD_OUT_REDIRECT_SECONDS);
  const session = query.data;
  // NIK pemesan hanya dikenal tersamar: dari `account` di respons tiket, atau dari sesi akun bila BE belum mengirimnya.
  // Tamu (tanpa akun) tidak pernah mendapat NIK tersimpan, apa pun isi cache atau respons sesi.
  const choices = account ? holderChoices(session?.maskedNik || account.nikMasked, aliases.data ?? []) : [];
  // Pilihan yang sudah tidak ada (mis. keluar akun di tab lain) tidak ikut dikirim; slotnya kembali ke isian NIK.
  const picks = Object.fromEntries(
    Object.entries(aliasPicks).filter(([, id]) => choices.some((choice) => choice.id === id)),
  );

  const submit = useMutation({
    mutationFn: submitBookingUseCase,
    // `replace`: Back dari pembayaran tidak boleh kembali ke formulir booking yang sudah terpakai.
    onSuccess: ({ bookingId }) => {
      clearBookingDraft(eventId);
      router.replace(`/orders/${encodeURIComponent(bookingId)}/pay`);
    },
    // Stok, NIK ditolak, atau grant habis tetap di layar; koneksi dan galat server jadi dialog dengan coba lagi.
    onError: (failure, input) => {
      const error = toAppError(failure);
      if (error.kind === "api" && error.code === "STOCK_INSUFFICIENT") {
        // Stok berubah di server: muat ulang supaya modal tahu sebagian atau semua kategori habis.
        void query.refetch();
        setStockSeconds(SOLD_OUT_REDIRECT_SECONDS);
        nikModal.open({ kind: "stock" });
      } else if (isUnexpectedError(error)) nikModal.open({ kind: "submitFailed", input });
      else nikModal.close();
    },
  });

  // Semua kategori habis: hitung mundur lalu kembali ke Beranda. Sebagian habis: modal menunggu pilihan customer.
  const stockOpen = nikModal.modal?.kind === "stock";
  const allSoldOut = Boolean(session) && session!.categories.every((category) => category.stock <= 0);
  const countingDown = stockOpen && allSoldOut;
  useEffect(() => {
    if (!countingDown) return;
    const id = setInterval(() => setStockSeconds((seconds) => seconds - 1), 1000);
    return () => clearInterval(id);
  }, [countingDown]);
  useEffect(() => {
    if (countingDown && stockSeconds <= 0) router.replace("/");
  }, [countingDown, stockSeconds, router]);

  const offsetMs = session ? serverOffsetMs(Date.parse(session.serverNow), query.dataUpdatedAt) : 0;
  const remainingMs = useCountdown(session?.expiresAt, offsetMs);
  // Server ditanya sekali saat hitung mundur nol. Jawabannya apa pun selain `expiresAt` yang lebih baru berarti waktu
  // habis: GET /tickets bisa tetap 200 (grant hidup lebih lama dari jendela 5 menit) atau menjawab kode selain 401.
  const [expiryAnsweredFor, setExpiryAnsweredFor] = useState<string>();
  const { refetch: refetchSession } = query;
  const expiresAt = session?.expiresAt;
  const askServer = useCallback(
    () => refetchSession().finally(() => setExpiryAnsweredFor(expiresAt)),
    [refetchSession, expiresAt],
  );
  useAskServerAtExpiry(expiresAt, remainingMs, askServer);

  const queuePath = `/events/${eventId}/queue`;
  const isExpired =
    query.isError &&
    (() => {
      const error = toAppError(query.error);
      return error.kind === "api" && error.code === "ACCESS_EXPIRED";
    })();
  // Formulir sudah tampil: waktu habis diberitahukan lewat modal di atasnya, bukan layar pengganti. Hanya setelah
  // server menjawab ACCESS_EXPIRED (ADR-0005).
  const serverAnsweredAtZero = remainingMs === 0 && expiryAnsweredFor === expiresAt;
  // Isian dan pilihan tiket dibuang saat akses habis, dan saat sesi booking berganti (`expiresAt` baru = grant baru
  // setelah antri ulang). Route yang disembunyikan Next tetap memegang state ini (ADR-0007), dan kepergian customer
  // tidak selalu lewat jalur "akses habis" (keluar sebelum server menjawab, kembali dari Payment, Back dari antrian),
  // jadi tanpa reset masuk ulang menampilkan tiket dan NIK sesi sebelumnya.
  const accessLost = isExpired || (remainingMs === 0 && expiryAnsweredFor === expiresAt);
  const [wasAccessLost, setWasAccessLost] = useState(false);
  const [formSessionExpiresAt, setFormSessionExpiresAt] = useState<string>();
  const sessionChanged =
    Boolean(expiresAt) && formSessionExpiresAt !== undefined && expiresAt !== formSessionExpiresAt;
  const resetForm = () => {
    dispatch({ type: "RESET" });
    setContactEmail("");
    setNiks({});
    setAliasPicks({});
    setChecks({});
    setTouched(new Set());
    setSubmitted(false);
    setFocusNik(null);
    nikModal.close();
    clearBookingDraft(eventId);
  };
  if (expiresAt && expiresAt !== formSessionExpiresAt) {
    setFormSessionExpiresAt(expiresAt);
    // Pertama kali formulir tampil di tab ini (muat ulang): pulihkan draf milik grant yang sama.
    const draft = formSessionExpiresAt === undefined && session ? loadBookingDraft(eventId, expiresAt) : null;
    if (draft && session) {
      dispatch({
        type: "RESTORE",
        selection: draft.selection,
        stock: Object.fromEntries(session.categories.map((category) => [category.id, category.stock])),
      });
      setNiks(draft.niks);
      setAliasPicks(draft.aliasPicks);
      setContactEmail(draft.contactEmail);
    }
  }
  const draftReady = Boolean(formSessionExpiresAt) && formSessionExpiresAt === expiresAt && !accessLost;
  useEffect(() => {
    if (!draftReady || !formSessionExpiresAt) return;
    saveBookingDraft(eventId, {
      expiresAt: formSessionExpiresAt,
      selection,
      niks,
      aliasPicks,
      contactEmail: typedEmail,
    });
  }, [draftReady, eventId, formSessionExpiresAt, selection, niks, aliasPicks, typedEmail]);
  if (accessLost !== wasAccessLost) {
    setWasAccessLost(accessLost);
    if (accessLost) resetForm();
  }
  if (sessionChanged) resetForm();
  // Galat kiriman terakhir ikut dibuang: tanpa ini banner "Pesanan ditolak" lama muncul di sesi berikutnya.
  const { reset: resetSubmit } = submit;
  const formEpoch = `${accessLost}:${formSessionExpiresAt ?? ""}`;
  useEffect(() => {
    resetSubmit();
  }, [formEpoch, resetSubmit]);
  const timedOutWithForm = (isExpired || serverAnsweredAtZero) && Boolean(session) && remainingMs !== null;
  // Grant yang habis dilepas dulu (cookie dihapus): selama cookie ada, `proxy.ts` memantulkan Waiting Room ke /book.
  const requeue = useMutation({
    mutationFn: endSessionUseCase,
    onSuccess: () => router.replace(queuePath),
  });
  const { mutate: requeueNow } = requeue;
  // Tanpa formulir (grant ditolak sejak awal): sesi yang berakhir kembali ke Beranda, sama seperti waktu habis dengan
  // formulir terbuka. Mengirim customer langsung ke Waiting Room memutar gelung: server masih menjawab grant lama
  // lewat /queue/me, grant dipulihkan, /tickets menjawab 401, lalu habis lagi. Bila melepas grant gagal, jangan
  // mengulang otomatis (cookie masih ada); layar kedaluwarsa dengan tombol yang menggantikannya.
  const leaveExpired = useMutation({
    mutationFn: endSessionUseCase,
    onSuccess: () => router.replace("/"),
  });
  const { mutate: leaveExpiredNow } = leaveExpired;
  const redirectHome =
    isExpired && !timedOutWithForm && appConfig.bookingExpiry === "queue" && !leaveExpired.isError;
  // Kedua efek di bawah memakai `useOnceWhileActive`: route ini disembunyikan Next saat ditinggalkan dan efeknya
  // berjalan ulang ketika tampil lagi (ADR-0007). Setelah antri ulang, tanpa penjaga itu efek ini melepas grant BARU
  // dan memantulkan customer lagi (Beranda / Waiting Room): gelung "habis → antri → habis".
  const leaveExpiredOnce = useCallback(() => leaveExpiredNow(), [leaveExpiredNow]);
  useOnceWhileActive(redirectHome, leaveExpiredOnce);

  // Waktu habis dengan formulir terbuka: lepas grant yang sudah kedaluwarsa sekali. Tanpa ini cookie grant masih
  // ada dan `proxy.ts` memantulkan Waiting Room kembali ke /book. Gagal melepas diabaikan; pindah ke Beranda jalan terus.
  const { mutate: releaseGrant } = useMutation({ mutationFn: endSessionUseCase });
  const releaseOnce = useCallback(() => releaseGrant(), [releaseGrant]);
  useOnceWhileActive(timedOutWithForm, releaseOnce);
  // Hitung mundur hanya jeda tampilan; kedaluwarsanya sendiri sudah diputuskan server.
  const timeoutSeconds = useAutoRedirect(
    timedOutWithForm ? "/" : undefined,
    BOOKING_TIMEOUT_REDIRECT_SECONDS,
  );

  if (redirectHome) {
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

  if (isExpired && !timedOutWithForm) {
    return {
      kind: "status",
      view: {
        ...siteChrome,
        title: t("booking.expired.title"),
        message: t("booking.error.ACCESS_EXPIRED"),
        // Waktu habis bukan galat customer: nada peringatan seperti dialog "Sesi berakhir".
        tone: "warning",
        action: { label: t("booking.expired.cta"), onClick: () => requeueNow() },
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

  const form = {
    contactEmail,
    emailLocked: Boolean(account),
    niks,
    aliasPicks: picks,
    checks,
    touched,
    submitted,
  };
  const touch = (field: string) => setTouched((current) => new Set(current).add(field));

  // NIK yang diketik dicek ke Dukcapil saat field ditinggalkan; hasil untuk NIK yang sudah diganti diabaikan.
  // Pemegang dari profil tidak dicek: kontrak menyatakannya sudah terverifikasi (§4.3). Tidak cocok atau nonaktif
  // membuka modal "Periksa NIK"; tanpa jawaban membuka modal "Verifikasi belum tersedia" tanpa menyebut NIK salah.
  // `force` dipakai tombol coba lagi untuk NIK yang sama; NIK yang sedang dicek tidak dikirim dua kali
  // (16 digit lalu blur): status "checking" sudah tercatat sebelum event berikutnya diproses.
  const checkNik = (slotKey: string, nik: string = niks[slotKey] ?? "", force = false) => {
    touch(`nik:${slotKey}`);
    const current = checks[slotKey];
    if (picks[slotKey] || !isNikFormat(nik)) return;
    if (current?.nik === nik && (current.state === "checking" || !force)) return;
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

  // "Ubah data": tutup modal dan kembali ke field NIK dengan isian yang ada. Modal NIK hanya muncul untuk NIK yang
  // diketik, jadi field-nya selalu bisa diubah.
  const editNik = (slotKey: string) => {
    nikModal.close();
    setFocusNik((current) => ({ slotKey, n: (current?.n ?? 0) + 1 }));
  };

  let dialog: ActionDialogModel | undefined;
  const open = nikModal.modal;
  if (timedOutWithForm) {
    // Menang atas dialog lain: tidak ada yang bisa dilanjutkan setelah waktu habis.
    dialog = toBookingTimeoutDialog({
      secondsLeft: timeoutSeconds ?? BOOKING_TIMEOUT_REDIRECT_SECONDS,
      onGoHome: () => router.replace("/"),
    });
  } else if (open?.kind === "mismatch") {
    dialog = toNikMismatchDialog({ onEdit: () => editNik(open.slotKey), onDismiss: nikModal.close });
  } else if (open?.kind === "unavailable") {
    dialog = toNikUnavailableDialog({
      onRetry: () => checkNik(open.slotKey, niks[open.slotKey] ?? "", true),
      onEdit: () => editNik(open.slotKey),
      onDismiss: nikModal.close,
      retrying: checks[open.slotKey]?.state === "checking",
    });
  } else if (open?.kind === "confirm" && session) {
    dialog = toBookingConfirmDialog({
      session,
      event: event.data,
      selection,
      contactEmail: open.input.contactEmail,
      tickets: open.input.tickets,
      aliases: choices,
      submitting: submit.isPending,
      onConfirm: () => submit.mutate(open.input),
      onDismiss: nikModal.close,
    });
  } else if (open?.kind === "stock" && session) {
    dialog = toStockUnavailableDialog({
      allSoldOut,
      secondsLeft: stockSeconds,
      onPickAnother: () => {
        dispatch({
          type: "CLAMP_TO_STOCK",
          stock: Object.fromEntries(session.categories.map((category) => [category.id, category.stock])),
        });
        nikModal.close();
      },
      onGoHome: () => router.replace("/"),
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
      onContactEmail: setContactEmail,
      // Hanya digit, maksimal 16: spasi, tanda baca, dan digit berlebih ditolak. NIK dicek otomatis begitu 16 digit.
      onNik: (slotKey, value) => {
        const nik = sanitizeNikInput(value);
        setNiks((current) => ({ ...current, [slotKey]: nik }));
        if (nik.length === NIK_LENGTH) checkNik(slotKey, nik);
      },
      onNikBlur: (slotKey) => checkNik(slotKey),
      aliases: choices,
      account,
      // Memilih NIK pemesan atau entri Daftar NIK hanya mencatat id-nya; tidak ada NIK lengkap untuk diisi atau dicek.
      // NIK yang sempat diketik di slot itu dikosongkan supaya tidak muncul lagi tanpa sengaja saat kembali ke "NIK lain".
      onHolderAlias: (slotKey, aliasId) => {
        const alias = choices.find((item) => item.id === aliasId);
        setAliasPicks((current) => {
          const next = { ...current };
          if (alias) next[slotKey] = alias.id;
          else delete next[slotKey];
          return next;
        });
        setNiks((current) => ({ ...current, [slotKey]: "" }));
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
        // Ringkasan dikonfirmasi dulu; booking baru dibuat setelah customer memilih lanjut.
        nikModal.open({
          kind: "confirm",
          input: {
            eventId,
            contactEmail,
            tickets: slots.map((slot) => ({
              categoryId: slot.categoryId,
              holder: holderInputFor(picks[slot.key], niks[slot.key] ?? ""),
            })),
          },
        });
      },
    }),
  };
}
