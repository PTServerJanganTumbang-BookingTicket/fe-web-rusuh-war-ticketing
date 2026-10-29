import { t } from "@/core/i18n/t.utils";
import { queueProgressPercent } from "../domain/queue-progress.rules";
import type { QueueState } from "../domain/queue-state.model";
import type { QueueViewProps } from "../views/QueueView";

const number = new Intl.NumberFormat("id-ID");

/** Tampilan state waiting (wireframe 9.2). State lain dibangun controller. */
export function toWaitingViewProps(state: Extract<QueueState, { status: "waiting" }>): QueueViewProps {
  const percent = queueProgressPercent(state.joinedPosition, state.position);
  return {
    title: t("queue.title"),
    eventName: state.eventName,
    state: "waiting",
    position: {
      label: t("queue.position.label"),
      value: t("queue.position.value", { position: number.format(state.position) }),
      suffix: t("queue.position.suffix"),
    },
    eta: {
      label: t("queue.eta.label"),
      value: t("queue.eta.value", { minutes: Math.max(1, Math.ceil(state.etaSeconds / 60)) }),
    },
    progress: { percent, label: t("queue.progress.label", { percent }) },
    note: t("queue.note"),
  };
}
