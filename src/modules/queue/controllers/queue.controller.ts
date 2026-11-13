"use client";

// Waiting Room. Requirement: FR-06–10, NFR-05, NFR-06. Wireframe 9.2. ADR-0016 (SSE + polling cadangan), ADR-0010 (sesi).
// Alur: join (POST) → stream SSE dibuka dari `sse_url` hasil join → posisi = ticket_no − nowServing tiap pesan →
// `/queue/me` saat giliran tiba. `/queue/serving` hanya polling cadangan selama stream tidak tersambung
// (kontrak §3.1–3.4, ADR-0016). Tiket habis / penjualan berakhir: modal lalu kembali ke beranda.

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CoreDependencies } from "@/core/application/core.dependencies";
import { toAppError, type AppError } from "@/core/domain/app-error";
import { useDependencies } from "@/core/controllers/dependencies.context";
import { useAutoRedirect } from "@/core/controllers/auto-redirect.hook";
import { useLiveUpdates } from "@/core/controllers/live-updates.hook";
import { t, type MessageKey } from "@/core/i18n/t.utils";
import { useSiteChrome } from "@/core/controllers/site-chrome.hook";
import type { QueueDependencies } from "../application/queue.dependencies";
import { QUEUE_GONE_REDIRECT_SECONDS } from "../domain/queue.constants";
import type { QueueState } from "../domain/queue-state.model";
import { queueEventQuery, queueJoinQuery, queueKeys, queuePositionQuery } from "./queue.queries";
import { toQueueGone, toQueueGoneDialog, toQueueViewProps, toWaitingStatus } from "./queue.mapper";
import type { QueueStatusProps, QueueViewProps } from "../views/QueueView";

function errorKey(error: AppError): MessageKey {
  if (error.kind === "network") return "queue.error.network";
  if (error.kind === "api" && error.code === "QUEUE_TOKEN_INVALID") return "queue.error.QUEUE_TOKEN_INVALID";
  if (error.kind === "api" && error.code === "QUEUE_FULL") return "queue.error.QUEUE_FULL";
  if (error.kind === "api" && error.code === "FULL_BOOKED") return "queue.error.FULL_BOOKED";
  if (error.kind === "api" && error.code === "CAPTCHA_FAILED") return "queue.error.CAPTCHA_FAILED";
  if (error.kind === "api" && error.code === "SALE_NOT_OPEN") return "queue.error.SALE_NOT_OPEN";
  if (error.kind === "api" && error.code === "SALE_CLOSED") return "queue.error.SALE_CLOSED";
  if (error.kind === "api" && error.code === "RATE_LIMITED") return "queue.error.RATE_LIMITED";
  return "queue.error.unknown";
}

export function useQueueController(eventId: string): QueueViewProps {
  const siteChrome = useSiteChrome();
  const router = useRouter();
  const {
    joinQueueUseCase,
    getQueueStateUseCase,
    getQueueEventUseCase,
    watchQueueStateUseCase,
    leaveQueueUseCase,
    startSessionUseCase,
    random,
  } = useDependencies<QueueDependencies & CoreDependencies>();
  const [confirmingLeave, setConfirmingLeave] = useState(false);
  const [fullDismissed, setFullDismissed] = useState(false);
  const queryClient = useQueryClient();
  // Join dulu; stream baru dibuka sesudahnya supaya `sse_url` dan tiket hasil join sudah ada.
  const join = useQuery(queueJoinQuery({ joinQueueUseCase }, eventId));
  // Hasil non-waiting dari kunjungan lalu sedang diverifikasi ulang ke server (lihat `queue.queries.ts`): jangan
  // diikuti, grant lamanya bisa sudah tidak berlaku. Layar memuat sampai server menjawab.
  const verifyingJoin = join.isFetching && join.data?.status !== "waiting";
  const joined = verifyingJoin ? undefined : join.data;
  // Stream dan posisi hanya untuk yang masih mengantre; hasil join lain (admitted, ended) sudah final untuk kunjungan ini.
  const waitingJoin = joined?.status === "waiting" ? joined : undefined;
  const live = useLiveUpdates<QueueState>({
    queryKey: queueKeys.position(eventId),
    watch: (observer) => watchQueueStateUseCase(eventId, observer),
    until: (state) => state.status !== "waiting",
    enabled: waitingJoin !== undefined,
  });
  const queue = useQuery(
    queuePositionQuery({ getQueueStateUseCase, random }, eventId, { live, initial: waitingJoin }),
  );
  // Detail event hanya pelengkap: gagal memuatnya tidak menghentikan antrian.
  const event = useQuery(queueEventQuery({ getQueueEventUseCase }, eventId));
  const forwarding = useRef(false);
  const enter = useMutation({
    mutationFn: (accessToken: string) => startSessionUseCase(eventId, accessToken),
    // `replace`: tombol Back dari booking tidak boleh kembali ke ruang tunggu yang gilirannya sudah terpakai.
    onSuccess: () => router.replace(`/events/${eventId}/book`),
    onSettled: () => {
      forwarding.current = false;
    },
  });
  // Posisi dari kunjungan lalu yang non-waiting sedang diverifikasi ulang: tunggu jawaban server.
  const verifying = verifyingJoin || (queue.isFetching && queue.data?.status !== "waiting");
  // Hasil join yang bukan waiting menang atas posisi lama di cache; posisi hanya melanjutkan join yang waiting.
  const current = waitingJoin ? (queue.data ?? waitingJoin) : joined;
  const data = verifying ? undefined : current;
  // Galat join (QUEUE_FULL, FULL_BOOKED, SALE_CLOSED, CAPTCHA_FAILED, ...). Galat polling saat data sudah ada
  // tidak menggantikan layar menunggu.
  const failure = join.error ?? queue.error;
  const failureError = failure ? toAppError(failure) : undefined;
  const gone = toQueueGone(data, failureError);
  const goneSeconds = useAutoRedirect(gone ? "/" : undefined, QUEUE_GONE_REDIRECT_SECONDS);

  // Giliran tiba: masuk otomatis (FR-06–08). Tombol hanya muncul sebagai cadangan bila penyimpanan sesi gagal.
  const admittedToken = data?.status === "admitted" ? data.accessToken : undefined;
  const { mutate } = enter;
  // Penjaga hanya untuk satu permintaan yang sedang berjalan (StrictMode memasang efek dua kali). Bukan "sudah pernah
  // masuk": route Waiting Room bisa tersembunyi lalu tampil lagi (Back/Forward) dengan state yang sama, dan saat itu
  // customer harus diteruskan ke booking lagi. Efek dijalankan ulang tiap layar tampil.
  useEffect(() => {
    if (!admittedToken || forwarding.current) return;
    forwarding.current = true;
    mutate(admittedToken);
  }, [admittedToken, mutate]);

  const forgetQueue = useCallback(() => {
    leaveQueueUseCase(eventId);
    queryClient.removeQueries({ queryKey: queueKeys.position(eventId) });
    queryClient.removeQueries({ queryKey: queueKeys.join(eventId) });
  }, [eventId, leaveQueueUseCase, queryClient]);
  const leaveQueue = () => {
    forgetQueue();
    router.push("/");
  };
  // Tiket habis / berakhir: kunjungan berikutnya harus join bersih, bukan memakai hasil lama dari cache.
  // Dibersihkan saat layar ditinggalkan, jadi berlaku juga untuk pengalihan otomatis setelah hitung mundur.
  const goneActive = gone !== undefined;
  useEffect(() => {
    if (!goneActive) return;
    return forgetQueue;
  }, [goneActive, forgetQueue]);
  const goHome = () => router.replace("/");
  const closeLeave = () => setConfirmingLeave(false);
  const leaveDialog: QueueViewProps["dialog"] = confirmingLeave
    ? {
        tone: "warning",
        illustration: "confirmation",
        title: t("queue.leave.title"),
        description: t("queue.leave.description"),
        primary: { label: t("queue.leave.confirm"), onClick: leaveQueue },
        secondary: { label: t("queue.leave.stay"), onClick: closeLeave },
        onDismiss: closeLeave,
      }
    : undefined;

  // Antrian penuh: customer boleh mencoba lagi, jadi modalnya punya jalan keluar dan coba lagi. Tiket habis dan
  // penjualan berakhir ada di `goneDialog`.
  const fullDialog: QueueViewProps["dialog"] =
    failureError?.kind === "api" && failureError.code === "QUEUE_FULL" && !fullDismissed
      ? {
          tone: "warning",
          illustration: "box",
          title: t("queue.full.QUEUE_FULL.title"),
          description: t("queue.full.QUEUE_FULL.description"),
          primary: {
            label: t("queue.full.retry"),
            busy: join.isFetching,
            onClick: () => {
              setFullDismissed(false);
              void join.refetch();
            },
          },
          secondary: { label: t("queue.full.home"), href: "/" },
          onDismiss: () => setFullDismissed(true),
        }
      : undefined;
  const goneDialog = gone ? toQueueGoneDialog({ gone, seconds: goneSeconds, onGoHome: goHome }) : undefined;

  const page = (status: QueueStatusProps) =>
    toQueueViewProps({
      dialog: leaveDialog ?? goneDialog ?? fullDialog,
      chrome: siteChrome,
      eventName: event.data?.name ?? (data?.eventName || undefined),
      event: event.data,
      status,
    });

  if (data?.status === "admitted") {
    return page({
      state: "admitted",
      badge: { label: t("queue.badge.admitted"), tone: "info" },
      message: enter.isError ? t(errorKey(toAppError(enter.error))) : t("queue.admitted.message"),
      action: enter.isError
        ? { label: t("queue.admitted.retry"), onClick: () => mutate(data.accessToken) }
        : undefined,
    });
  }

  if (data?.status === "waiting") {
    const waiting = toWaitingStatus(data);
    // Stream tidak tersambung dan polling cadangan gagal: angka di layar tidak lagi diperbarui. Beri tahu dan
    // sediakan tombol ambil ulang, daripada tampak "diperbarui otomatis" tanpa batas.
    const stalled = queue.isError;
    return page({
      ...waiting,
      ...(stalled
        ? {
            notice: t("queue.stalled"),
            updatedNote: t("queue.stalled.note"),
            refresh: {
              label: t("queue.stalled.retry"),
              onClick: () => void queue.refetch(),
              disabled: queue.isFetching,
            },
          }
        : {}),
      leave: { label: t("queue.leave.button"), onClick: () => setConfirmingLeave(true) },
    });
  }

  if (data?.status === "ended") {
    return page({
      state: "error",
      badge: { label: t("queue.badge.error"), tone: "error" },
      message: t(`queue.ended.${data.reason}`),
    });
  }

  if (failureError) {
    return page({
      state: "error",
      badge: { label: t("queue.badge.error"), tone: "error" },
      message: t(errorKey(failureError)),
    });
  }

  return page({ state: "loading", message: t("queue.loading.message") });
}
