"use client";

// Waiting Room. Requirement: FR-06–10, NFR-05, NFR-06. Wireframe 9.2. ADR-0004 (polling), ADR-0010 (sesi).

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queuePositionQuery, startSession } from "@rusuh/api";
import { toAppError, type AppError } from "@rusuh/core";
import { t, type MessageKey } from "@rusuh/i18n";
import type { QueueViewProps } from "@rusuh/ui";
import { toWaitingViewProps } from "./toQueueViewProps";

function errorKey(error: AppError): MessageKey {
  if (error.kind === "network") return "queue.error.network";
  if (error.kind === "api" && error.code === "QUEUE_TOKEN_INVALID") return "queue.error.QUEUE_TOKEN_INVALID";
  return "queue.error.unknown";
}

export function useQueueViewModel(eventId: string): QueueViewProps {
  const router = useRouter();
  const queue = useQuery(queuePositionQuery(eventId));
  const enter = useMutation({
    mutationFn: startSession,
    onSuccess: () => router.push(`/events/${eventId}/book`),
  });
  const title = t("queue.title");
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

  if (data?.status === "admitted") {
    return {
      title,
      eventName: data.eventName,
      state: "admitted",
      message: enter.isError ? t(errorKey(toAppError(enter.error))) : t("queue.admitted.message"),
      action: enter.isError ? { label: t("queue.admitted.retry"), onClick: () => mutate(data.accessToken) } : undefined,
    };
  }

  if (data?.status === "waiting") return toWaitingViewProps(data);

  if (queue.isError) {
    return { title, state: "error", message: t(errorKey(toAppError(queue.error))) };
  }

  return { title, state: "loading", message: t("queue.loading.message") };
}
