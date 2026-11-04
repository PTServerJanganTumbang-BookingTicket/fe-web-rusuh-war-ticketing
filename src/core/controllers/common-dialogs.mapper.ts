import type { AppError } from "@/core/domain/app-error";
import { t } from "@/core/i18n/t.utils";
import type { ActionDialogModel } from "./modal.hook";

/**
 * Dialog umum lintas modul (katalog di `docs/architecture/action-dialog.md`). Semua teks dari i18n; controller hanya
 * memberi aksi. Dialog khusus satu modul ada di modul itu, dialog NIK di `nik-dialog.mapper.ts`.
 */

type Retry = { onRetry: () => void; onDismiss: () => void; retrying?: boolean };

/** Tidak ada respons sama sekali (offline, DNS, CORS): minta cek koneksi, isian tetap. */
export function toConnectionProblemDialog({
  onRetry,
  onDismiss,
  retrying = false,
}: Retry): ActionDialogModel {
  return {
    tone: "error",
    title: t("dialog.connection.title"),
    description: t("dialog.connection.description"),
    primary: { label: t("dialog.retry"), onClick: onRetry, busy: retrying },
    onDismiss,
  };
}

/** Server menjawab galat yang tidak dikenali layar (5xx, respons tidak sesuai kontrak). */
export function toSomethingWentWrongDialog({
  onRetry,
  onDismiss,
  retrying = false,
}: Retry): ActionDialogModel {
  return {
    tone: "error",
    title: t("dialog.unknown.title"),
    description: t("dialog.unknown.description"),
    primary: { label: t("dialog.retry"), onClick: onRetry, busy: retrying },
    onDismiss,
  };
}

/** Galat yang tidak punya dialog khusus: koneksi bila tidak ada respons, selain itu "terjadi kesalahan". */
export function toRequestFailedDialog(error: AppError, options: Retry): ActionDialogModel {
  return error.kind === "network" ? toConnectionProblemDialog(options) : toSomethingWentWrongDialog(options);
}

/** Galat yang pantas jadi dialog umum: tanpa respons atau respons yang tidak dikenali. Kode bisnis tetap di layar. */
export function isUnexpectedError(error: AppError): boolean {
  return error.kind === "network" || error.kind === "unknown" || error.kind === "invalid_response";
}

/**
 * Sesi akun habis (401 setelah refresh gagal, ADR-0023). Booking yang sedang berjalan tidak dibatalkan (prinsip
 * "jangan PHP"); customer masuk lagi lalu kembali.
 */
export function toSessionExpiredDialog({
  loginHref = "/login?session=expired",
  onDismiss,
}: {
  loginHref?: string;
  onDismiss: () => void;
}): ActionDialogModel {
  return {
    tone: "warning",
    icon: "clock",
    title: t("dialog.sessionExpired.title"),
    description: t("dialog.sessionExpired.description"),
    primary: { label: t("dialog.sessionExpired.login"), href: loginHref },
    secondary: { label: t("dialog.close"), onClick: onDismiss },
    onDismiss,
  };
}
