import { t } from "@/core/i18n/t.utils";
import type { ActionDialogModel } from "./modal.hook";

/**
 * Dialog verifikasi NIK yang dipakai Detail Ticket dan alias di profil. Desain "G / Timeout" dan "G / Mismatch".
 */
export type NikDialogKind = "unavailable" | "mismatch";

/**
 * Dukcapil tidak menjawab (timeout, jaringan, galat server): hasil identitas tidak diketahui. Isian tetap disimpan,
 * NIK tidak pernah disebut salah, dan coba lagi hanya atas tindakan customer.
 */
export function toNikUnavailableDialog({
  onRetry,
  onEdit,
  onDismiss,
  retrying = false,
}: {
  onRetry: () => void;
  onEdit: () => void;
  onDismiss: () => void;
  retrying?: boolean;
}): ActionDialogModel {
  return {
    tone: "error",
    title: t("dialog.nikUnavailable.title"),
    description: t("dialog.nikUnavailable.description"),
    primary: { label: t("dialog.retry"), onClick: onRetry, busy: retrying },
    secondary: { label: t("dialog.editInformation"), onClick: onEdit },
    onDismiss,
  };
}

/** Dukcapil menjawab NIK tidak cocok atau tidak aktif: keputusan pasti, jadi tidak ada coba lagi langsung. */
export function toNikMismatchDialog({
  onEdit,
  onDismiss,
}: {
  onEdit: () => void;
  onDismiss: () => void;
}): ActionDialogModel {
  return {
    tone: "error",
    title: t("dialog.nikMismatch.title"),
    description: t("dialog.nikMismatch.description"),
    primary: { label: t("dialog.editInformation"), onClick: onEdit },
    onDismiss,
  };
}
