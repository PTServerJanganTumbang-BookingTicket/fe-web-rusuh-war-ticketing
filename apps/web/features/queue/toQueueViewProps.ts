import { queueProgressPercent, type AppError, type QueueState } from "@rusuh/core";
import { t, type MessageKey } from "@rusuh/i18n";
import type { QueueViewProps } from "@rusuh/ui";
import type { QueueViewModel } from "./useQueueViewModel";

const number = new Intl.NumberFormat("id-ID");

function errorKey(error: AppError): MessageKey {
  if (error.kind === "network") return "queue.error.network";
  if (error.kind === "api" && error.code === "QUEUE_TOKEN_INVALID") return "queue.error.QUEUE_TOKEN_INVALID";
  return "queue.error.unknown";
}

/** Tampilan menunggu (wireframe 9.2). */
function toWaitingViewProps(queue: Extract<QueueState, { status: "waiting" }>): QueueViewProps {
  const percent = queueProgressPercent(queue.joinedPosition, queue.position);
  return {
    title: t("queue.title"),
    eventName: queue.eventName,
    state: "waiting",
    position: {
      label: t("queue.position.label"),
      value: t("queue.position.value", { position: number.format(queue.position) }),
      suffix: t("queue.position.suffix"),
    },
    eta: {
      label: t("queue.eta.label"),
      value: t("queue.eta.value", { minutes: Math.max(1, Math.ceil(queue.etaSeconds / 60)) }),
    },
    progress: { percent, label: t("queue.progress.label", { percent }) },
    note: t("queue.note"),
  };
}

export function toQueueViewProps({ state, actions }: QueueViewModel): QueueViewProps {
  const title = t("queue.title");
  switch (state.kind) {
    case "loading":
      return { title, state: "loading", message: t("queue.loading.message") };
    case "failed":
      return { title, state: "error", message: t(errorKey(state.error)) };
    case "waiting":
      return toWaitingViewProps(state.queue);
    case "entering":
      return { title, eventName: state.eventName, state: "admitted", message: t("queue.admitted.message") };
    case "enterFailed":
      return {
        title,
        eventName: state.eventName,
        state: "admitted",
        message: t(errorKey(state.error)),
        action: { label: t("queue.admitted.retry"), onClick: actions.retryEnter },
      };
  }
}
