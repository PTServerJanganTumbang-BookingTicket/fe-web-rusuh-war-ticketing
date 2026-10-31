"use client";

// Waiting Room. Requirement: FR-06–10, NFR-05, NFR-06. Wireframe 9.2. ADR-0016 (SSE + polling cadangan), ADR-0010 (sesi).

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { CoreDependencies } from "@/core/application/core.dependencies";
import { toAppError, type AppError } from "@/core/domain/app-error";
import { useDependencies } from "@/core/controllers/dependencies.context";
import { useLiveUpdates } from "@/core/controllers/live-updates.hook";
import { t, type MessageKey } from "@/core/i18n/t.utils";
import type { QueueDependencies } from "../application/queue.dependencies";
import type { QueueState } from "../domain/queue-state.model";
import { queueKeys, queuePositionQuery } from "./queue.queries";
import { toWaitingViewProps } from "./queue.mapper";
import type { QueueViewProps } from "../views/QueueView";

function errorKey(error: AppError): MessageKey {
  if (error.kind === "network") return "queue.error.network";
  if (error.kind === "api" && error.code === "QUEUE_TOKEN_INVALID") return "queue.error.QUEUE_TOKEN_INVALID";
  return "queue.error.unknown";
}

export function useQueueController(eventId: string): QueueViewProps {
  const router = useRouter();
  const { getQueueStateUseCase, watchQueueStateUseCase, startSessionUseCase, random } = useDependencies<
    QueueDependencies & CoreDependencies
  >();
  const live = useLiveUpdates<QueueState>({
    queryKey: queueKeys.position(eventId),
    watch: (observer) => watchQueueStateUseCase(eventId, observer),
    until: (state) => state.status === "admitted",
  });
  const queue = useQuery(queuePositionQuery({ getQueueStateUseCase, random }, eventId, live));
  const enter = useMutation({
    mutationFn: (accessToken: string) => startSessionUseCase(accessToken),
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
      action: enter.isError
        ? { label: t("queue.admitted.retry"), onClick: () => mutate(data.accessToken) }
        : undefined,
    };
  }

  if (data?.status === "waiting") return toWaitingViewProps(data);

  if (queue.isError) {
    return { title, state: "error", message: t(errorKey(toAppError(queue.error))) };
  }

  return { title, state: "loading", message: t("queue.loading.message") };
}
