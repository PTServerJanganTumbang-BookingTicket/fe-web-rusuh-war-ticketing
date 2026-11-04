"use client";

import { useCallback, useState } from "react";

/**
 * Bentuk dialog aksi yang dibangun controller. Sama dengan `ActionDialogProps` di
 * `components/ui/layout/ActionDialog.tsx`; dideklarasikan ulang karena `core/controllers` tidak boleh mengimpor
 * design system. TypeScript mencocokkan keduanya secara struktural.
 */
export type ActionDialogAction =
  { label: string; onClick: () => void; busy?: boolean } | { label: string; href: string };

export type ActionDialogModel = {
  tone: "error" | "info" | "success";
  title: string;
  description: string;
  primary: ActionDialogAction;
  secondary?: ActionDialogAction;
  onDismiss: () => void;
};

export type ModalController<M extends { kind: string }> = {
  /** Modal yang sedang terbuka, atau `null`. Satu layar hanya punya satu modal aktif. */
  modal: M | null;
  open: (modal: M) => void;
  close: () => void;
};

/**
 * Manajemen modal per layar. State modal hanya UI dan milik controller layar itu, jadi tidak ada Context atau store
 * global (ADR-0003, ADR-0004). Controller membuka modal dengan data yang dibutuhkan aksinya (misalnya slot tiket),
 * lalu memetakan `modal` ke `ActionDialogModel` lewat mapper. Panggil di awal controller, sebelum early return.
 */
export function useModal<M extends { kind: string }>(): ModalController<M> {
  const [modal, setModal] = useState<M | null>(null);
  const close = useCallback(() => setModal(null), []);
  return { modal, open: setModal, close };
}
