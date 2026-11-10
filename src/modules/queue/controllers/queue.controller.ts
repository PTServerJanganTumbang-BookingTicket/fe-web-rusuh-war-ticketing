"use client";

// Waiting Room. Requirement: FR-06–10, NFR-05, NFR-06. Wireframe 9.2. ADR-0016 (SSE + polling cadangan), ADR-0010 (sesi).

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CoreDependencies } from "@/core/application/core.dependencies";
import { toAppError, type AppError } from "@/core/domain/app-error";
import { useDependencies } from "@/core/controllers/dependencies.context";
import { useLiveUpdates } from "@/core/controllers/live-updates.hook";
import { t, type MessageKey } from "@/core/i18n/t.utils";
import { useSiteChrome } from "@/core/controllers/site-chrome.hook";
import type { QueueDependencies } from "../application/queue.dependencies";
import type { QueueState } from "../domain/queue-state.model";
import { queueEventQuery, queueKeys, queuePositionQuery } from "./queue.queries";
import { toQueueViewProps, toWaitingStatus } from "./queue.mapper";
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
  const live = useLiveUpdates<QueueState>({
    queryKey: queueKeys.position(eventId),
    watch: (observer) => watchQueueStateUseCase(eventId, observer),
    until: (state) => state.status !== "waiting",
  });
  const queue = useQuery(queuePositionQuery({ getQueueStateUseCase, random }, eventId, live));
  // Detail event hanya pelengkap: gagal memuatnya tidak menghentikan antrian.
  const event = useQuery(queueEventQuery({ getQueueEventUseCase }, eventId));
  const enter = useMutation({
    mutationFn: (accessToken: string) => startSessionUseCase(accessToken),
    onSuccess: () => router.push(`/events/${eventId}/book`),
  });
  const data = queue.data;

  // Giliran tiba: masuk otomatis (FR-06–08). Tombol hanya muncul sebagai cadangan bila penyimpanan sesi gagal.
  const admittedToken = data?.status === "admitted" ? data.accessToken : undefined;
  const entered = useRef<string>(undefined);
  const { mutate } = enter;
  useEffect(() => {
    if (!admittedToken || entered.current === admittedToken) return;
    entered.current = admittedToken;
    mutate(admittedToken);
  }, [admittedToken, mutate]);

  const leaveQueue = () => {
    leaveQueueUseCase(eventId);
    queryClient.removeQueries({ queryKey: queueKeys.position(eventId) });
    router.push("/");
  };
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

  // Beranda masih menampilkan antrian terbuka (data di-cache), tetapi join ditolak karena penuh: beri tahu lewat
  // modal dengan jalan keluar, bukan hanya pesan di panel status.
  const fullError = queue.isError ? toAppError(queue.error) : undefined;
  const fullKind =
    fullError?.kind === "api" && (fullError.code === "QUEUE_FULL" || fullError.code === "FULL_BOOKED")
      ? fullError.code
      : undefined;
  const fullDialog: QueueViewProps["dialog"] =
    fullKind && !fullDismissed
      ? {
          tone: "warning",
          illustration: "box",
          title: t(`queue.full.${fullKind}.title`),
          description: t(`queue.full.${fullKind}.description`),
          primary: {
            label: t("queue.full.retry"),
            busy: queue.isFetching,
            onClick: () => {
              setFullDismissed(false);
              void queue.refetch();
            },
          },
          secondary: { label: t("queue.full.home"), href: "/" },
          onDismiss: () => setFullDismissed(true),
        }
      : undefined;

  const page = (status: QueueStatusProps) =>
    toQueueViewProps({
      dialog: leaveDialog ?? fullDialog,
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
    return page({
      ...toWaitingStatus(data),
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

  if (queue.isError) {
    return page({
      state: "error",
      badge: { label: t("queue.badge.error"), tone: "error" },
      message: t(errorKey(toAppError(queue.error))),
    });
  }

  return page({ state: "loading", message: t("queue.loading.message") });
}
