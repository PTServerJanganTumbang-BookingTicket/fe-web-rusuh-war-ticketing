"use client";

// Akun dan alias (saved NIK). Requirement: FR-30, BR-02. ADR-0011, ADR-0023 (halaman yang butuh akun meminta
// login sendiri; tidak ada redirect paksa dari proxy). Identitas yang tampil berasal dari sesi (email dan NIK
// tersamar); kontrak tidak punya endpoint profil maupun ubah alias, jadi alias hanya ditambah atau dihapus.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toAppError, type AppError } from "@/core/domain/app-error";
import { useDependencies } from "@/core/controllers/dependencies.context";
import { t, type MessageKey } from "@/core/i18n/t.utils";
import { useSiteChrome } from "@/core/controllers/site-chrome.hook";
import { clearAfterSignOut } from "@/core/controllers/session.cache";
import { NIK_LENGTH, sanitizeNikInput } from "@/core/domain/nik.utils";
import { useModal, type ActionDialogModel } from "@/core/controllers/modal.hook";
import {
  toNikMismatchDialog,
  toNikUnavailableDialog,
  type NikDialogKind,
} from "@/core/controllers/nik-dialog.mapper";
import {
  isUnexpectedError,
  toRequestFailedDialog,
  toSessionExpiredDialog,
} from "@/core/controllers/common-dialogs.mapper";
import type { AuthDependencies } from "../application/auth.dependencies";
import type { SavedNik } from "../domain/account.model";
import { validateSavedNikInput, type SavedNikInputError } from "../domain/account.rules";
import { SAVED_NIK_LABEL_MAX_LENGTH } from "../domain/auth.constants";
import { authErrorKey } from "./auth-error.mapper";
import { accountQuery, authKeys, savedNiksQuery } from "./auth.queries";
import type { AccountViewProps, AliasFormProps } from "../views/AccountView";

const savedNikErrors = {
  SAVED_NIK_REJECTED: "account.error.SAVED_NIK_REJECTED",
  NIK_INVALID: "account.error.NIK_INVALID",
  UNAUTHENTICATED: "account.error.UNAUTHENTICATED",
} as const;

/** Dua huruf awal untuk avatar: "Budi Santoso" → "BS", "you@example.com" → "Y". */
function initialsOf(name: string): string {
  const words = name
    .trim()
    .split("@")[0]!
    .split(/[\s@._-]+/)
    .filter(Boolean);
  return words
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
}

type AccountModal =
  { kind: NikDialogKind } | { kind: "sessionExpired" } | { kind: "removeFailed"; id: string };

const isSessionEnded = (error: AppError) => error.kind === "api" && error.code === "UNAUTHENTICATED";

/**
 * Galat simpan alias yang jadi modal: sesi habis, Dukcapil menolak (pasti), atau tidak menjawab (belum diketahui).
 * Galat lain, misalnya alias sudah tersimpan, tetap tampil di kartu.
 */
function saveDialogKindOf(error: AppError): "sessionExpired" | NikDialogKind | null {
  if (isSessionEnded(error)) return "sessionExpired";
  if (error.kind === "api") return error.code === "NIK_INVALID" ? "mismatch" : null;
  return "unavailable";
}

/** Galat hapus alias yang jadi modal: sesi habis atau galat tak terduga (bisa dicoba lagi). */
function removeDialogKindOf(error: AppError): "sessionExpired" | "removeFailed" | null {
  if (isSessionEnded(error)) return "sessionExpired";
  return isUnexpectedError(error) ? "removeFailed" : null;
}

function labelError(error: SavedNikInputError["label"]): string | undefined {
  if (error === "too_long") return t("account.saved.label.tooLong", { max: SAVED_NIK_LABEL_MAX_LENGTH });
  return undefined;
}

export function useAccountController(): AccountViewProps {
  const siteChrome = useSiteChrome();
  const nikModal = useModal<AccountModal>();
  /** Berubah tiap "Ubah data" supaya field NIK difokus lagi. */
  const [focusNik, setFocusNik] = useState(0);
  const router = useRouter();
  const queryClient = useQueryClient();
  const {
    getAccountUseCase,
    listSavedNiksUseCase,
    addSavedNikUseCase,
    removeSavedNikUseCase,
    signOutUseCase,
  } = useDependencies<AuthDependencies>();
  const account = useQuery(accountQuery({ getAccountUseCase }));
  const signedIn = Boolean(account.data);
  const saved = useQuery({ ...savedNiksQuery({ listSavedNiksUseCase }), enabled: signedIn });

  const [label, setLabel] = useState("");
  const [nik, setNik] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [pendingRemove, setPendingRemove] = useState<SavedNik | null>(null);

  const resetForm = () => {
    setLabel("");
    setNik("");
    setSubmitted(false);
  };
  const refreshSaved = () => queryClient.invalidateQueries({ queryKey: authKeys.savedNiks });
  const save = useMutation({
    mutationFn: () => addSavedNikUseCase({ label, nik }),
    onSuccess: async () => {
      nikModal.close();
      resetForm();
      await refreshSaved();
    },
    onError: (error) => {
      const kind = saveDialogKindOf(toAppError(error));
      if (kind) nikModal.open({ kind });
    },
  });
  const remove = useMutation({
    mutationFn: (id: string) => removeSavedNikUseCase(id),
    onSuccess: async () => {
      nikModal.close();
      setPendingRemove(null);
      await refreshSaved();
    },
    onError: (error, id) => {
      const kind = removeDialogKindOf(toAppError(error));
      if (!kind) return;
      setPendingRemove(null);
      nikModal.open(kind === "removeFailed" ? { kind, id } : { kind });
    },
  });
  const signOut = useMutation({
    mutationFn: () => signOutUseCase(),
    onSuccess: () => {
      clearAfterSignOut(queryClient);
      router.push("/");
    },
  });
  const page = {
    ...siteChrome,
    header: {
      breadcrumb: [{ label: t("checkout.breadcrumb.home"), href: "/" }, { label: t("account.title") }],
      heading: t("account.heading"),
      subtitle: t("account.subtitle"),
    },
  };

  if (account.isPending || (signedIn && saved.isPending)) {
    return { ...page, kind: "loading", message: t("account.loading") };
  }
  if (!account.data) {
    return {
      ...page,
      kind: "signedOut",
      title: t("account.signedOut.title"),
      message: t("account.signedOut.message"),
      login: { label: t("account.signedOut.cta"), href: "/login" },
    };
  }

  const list = saved.data ?? { maxEntries: 0, savedNiks: [] };
  const full = list.savedNiks.length >= list.maxEntries;
  // Galat yang sudah tampil sebagai modal tidak diulang di kartu.
  const saveInline = save.error && !saveDialogKindOf(toAppError(save.error)) ? save.error : null;
  const removeInline = remove.error && !removeDialogKindOf(toAppError(remove.error)) ? remove.error : null;
  const failed = saveInline ?? removeInline ?? saved.error;
  const editNik = () => {
    nikModal.close();
    setFocusNik((n) => n + 1);
  };
  let dialog: ActionDialogModel | undefined;
  const openModal = nikModal.modal;
  if (openModal?.kind === "mismatch") {
    dialog = toNikMismatchDialog({ onEdit: editNik, onDismiss: nikModal.close });
  } else if (openModal?.kind === "unavailable") {
    dialog = toNikUnavailableDialog({
      onRetry: () => save.mutate(),
      onEdit: editNik,
      onDismiss: nikModal.close,
      retrying: save.isPending,
    });
  } else if (openModal?.kind === "sessionExpired") {
    dialog = toSessionExpiredDialog({ onDismiss: nikModal.close });
  } else if (openModal?.kind === "removeFailed" && remove.error) {
    dialog = toRequestFailedDialog(toAppError(remove.error), {
      onRetry: () => remove.mutate(openModal.id),
      onDismiss: nikModal.close,
      retrying: remove.isPending,
    });
  }
  // Konfirmasi hapus memakai dialog aksi yang sama dengan modal lain; satu dialog sekaligus.
  if (!dialog && pendingRemove) {
    const cancelRemove = () => setPendingRemove(null);
    dialog = {
      tone: "error",
      icon: "alert",
      title: t("account.saved.confirm.title"),
      description: t("account.saved.confirm.description", {
        label: pendingRemove.label,
        nik: pendingRemove.nikMasked,
      }),
      primary: {
        label: remove.isPending ? t("account.saved.removing") : t("account.saved.confirm.cta"),
        busy: remove.isPending,
        onClick: () => remove.mutate(pendingRemove.id),
      },
      secondary: { label: t("account.saved.cancel"), onClick: cancelRemove },
      onDismiss: cancelRemove,
    };
  }
  const invalid = submitted ? validateSavedNikInput({ label, nik }) : null;

  const formFields = (): Pick<AliasFormProps, "label" | "nik" | "notice"> => ({
    notice: t("account.saved.pdp"),
    label: {
      label: t("account.saved.label.label"),
      placeholder: t("account.saved.label.placeholder"),
      value: label,
      error: labelError(invalid?.label),
      onChange: setLabel,
    },
    nik: {
      label: t("account.saved.nik.label"),
      placeholder: t("booking.holder.nik.placeholder"),
      value: nik,
      focusKey: focusNik || undefined,
      maxLength: NIK_LENGTH,
      error: invalid?.nik ? t("register.nik.invalid") : undefined,
      // Hanya digit, maksimal 16: spasi, tanda baca, dan digit berlebih ditolak.
      onChange: (value) => setNik(sanitizeNikInput(value)),
    },
  });
  const submit: AliasFormProps["submit"] = {
    label: save.isPending ? t("account.saved.saving") : t("account.saved.submit"),
    disabled: save.isPending,
    onSubmit: () => {
      setSubmitted(true);
      if (!validateSavedNikInput({ label, nik })) save.mutate();
    },
  };

  let errorKey: MessageKey | undefined;
  if (failed) errorKey = authErrorKey(toAppError(failed), savedNikErrors);
  const fields = [
    { label: t("account.email.label"), value: account.data.email },
    { label: t("account.nik.label"), value: account.data.nikMasked },
  ];

  const displayName = account.data.email;
  return {
    ...page,
    kind: "ready",
    profile: {
      title: t("account.profile.title"),
      name: displayName,
      initials: initialsOf(displayName),
      email: account.data.email,
      fields,
      tickets: { label: t("account.tickets.cta"), href: "/tickets" },
    },
    saved: {
      title: t("account.saved.title"),
      count: t("account.saved.count", { count: list.savedNiks.length, max: list.maxEntries }),
      hint: t("account.saved.hint"),
      emptyTitle: t("account.saved.empty.title"),
      emptyLabel: t("account.saved.empty"),
      error: errorKey ? t(errorKey) : undefined,
      busy: remove.isPending || save.isPending,
      items: list.savedNiks.map((item) => ({
        id: item.id,
        label: item.label,
        initials: initialsOf(item.label),
        nikMasked: item.nikMasked,
        remove: {
          text: t("account.saved.removeShort"),
          label: t("account.saved.remove", { label: item.label }),
          onClick: () => setPendingRemove(item),
        },
      })),
    },
    fullNotice: full && saved.data ? t("account.saved.full") : undefined,
    notice: t("account.notice"),
    add:
      full && saved.data
        ? undefined
        : {
            id: "alias-new",
            title: t("account.saved.add.title"),
            ...formFields(),
            submit,
          },
    dialog,
    signOut: { label: t("account.signOut"), disabled: signOut.isPending, onClick: () => signOut.mutate() },
  };
}
