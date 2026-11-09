"use client";

import { useState } from "react";
import { t } from "@/core/i18n/t.utils";
import type { ActionDialogModel } from "./modal.hook";
import { useOnlineStatus } from "./online-status.hook";

/**
 * Dialog "tanpa jaringan" yang muncul saat peramban offline dan hilang sendiri begitu koneksi kembali. Customer boleh
 * menutupnya; dialog muncul lagi pada putusnya koneksi berikutnya. Teks dan ilustrasi dari spreadsheet referensi aset.
 */
export function useOfflineDialog(): ActionDialogModel | undefined {
  const online = useOnlineStatus();
  // Penutupan hanya berlaku untuk putus koneksi yang sedang berjalan.
  const [dismissedAt, setDismissedAt] = useState<boolean>(false);
  if (online && dismissedAt) setDismissedAt(false);
  if (online || dismissedAt) return undefined;
  const dismiss = () => setDismissedAt(true);
  return {
    tone: "error",
    illustration: "network",
    title: t("dialog.offline.title"),
    description: t("dialog.offline.description"),
    primary: { label: t("dialog.close"), onClick: dismiss },
    onDismiss: dismiss,
  };
}
