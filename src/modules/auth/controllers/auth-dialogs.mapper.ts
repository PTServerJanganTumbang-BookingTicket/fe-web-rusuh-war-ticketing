import type { ActionDialogModel } from "@/core/controllers/modal.hook";
import { t } from "@/core/i18n/t.utils";

/** Dialog khusus login dan register. Katalog lengkap di `docs/architecture/action-dialog.md`. */

type Action = () => void;

/** Layanan auth BE gagal (5xx atau respons tidak dikenali): isian tetap, coba lagi atas tindakan customer. */
export function toServiceUnavailableDialog({
  onRetry,
  onDismiss,
  retrying = false,
}: {
  onRetry: Action;
  onDismiss: Action;
  retrying?: boolean;
}): ActionDialogModel {
  return {
    tone: "error",
    illustration: "error",
    title: t("dialog.serviceUnavailable.title"),
    description: t("dialog.serviceUnavailable.description"),
    primary: { label: t("dialog.retry"), onClick: onRetry, busy: retrying },
    secondary: { label: t("dialog.close"), onClick: onDismiss },
    onDismiss,
  };
}

/** Pendaftaran gagal karena galat yang tidak dikenali. */
export function toRegistrationFailedDialog({
  onRetry,
  onDismiss,
  retrying = false,
}: {
  onRetry: Action;
  onDismiss: Action;
  retrying?: boolean;
}): ActionDialogModel {
  return {
    tone: "error",
    illustration: "error",
    title: t("dialog.registrationFailed.title"),
    description: t("dialog.registrationFailed.description"),
    primary: { label: t("dialog.retry"), onClick: onRetry, busy: retrying },
    secondary: { label: t("dialog.close"), onClick: onDismiss },
    onDismiss,
  };
}

/**
 * Register ditolak 409. Kontrak hanya menyebut NIK sudah terdaftar, jadi teks menyebut email atau NIK dan tidak
 * memastikan akun mana yang ada.
 */
export function toAlreadyRegisteredDialog({
  onEdit,
  onDismiss,
}: {
  onEdit: Action;
  onDismiss: Action;
}): ActionDialogModel {
  return {
    tone: "error",
    illustration: "confirmation",
    title: t("dialog.alreadyRegistered.title"),
    description: t("dialog.alreadyRegistered.description"),
    primary: { label: t("dialog.alreadyRegistered.login"), href: "/login" },
    secondary: { label: t("dialog.alreadyRegistered.edit"), onClick: onEdit },
    onDismiss,
  };
}

/**
 * Link verifikasi email tidak valid atau kedaluwarsa. Belum dipakai: kontrak belum punya endpoint verifikasi
 * pendaftaran (ADR-0023), jadi `/register/verified` masih statis.
 */
export function toEmailVerificationFailedDialog({
  onResend,
  onDismiss,
  resending = false,
}: {
  onResend: Action;
  onDismiss: Action;
  resending?: boolean;
}): ActionDialogModel {
  return {
    tone: "error",
    illustration: "error",
    title: t("dialog.emailVerificationFailed.title"),
    description: t("dialog.emailVerificationFailed.description"),
    primary: { label: t("dialog.emailVerificationFailed.resend"), onClick: onResend, busy: resending },
    onDismiss,
  };
}

/** Link login sekali pakai sudah ditukar atau kedaluwarsa (desain "I / Already used"). */
export function toLoginLinkFailedDialog({ onDismiss }: { onDismiss: Action }): ActionDialogModel {
  return {
    tone: "error",
    illustration: "error",
    title: t("dialog.loginLink.title"),
    description: t("dialog.loginLink.description"),
    primary: { label: t("dialog.loginLink.requestNew"), href: "/login" },
    onDismiss,
  };
}
