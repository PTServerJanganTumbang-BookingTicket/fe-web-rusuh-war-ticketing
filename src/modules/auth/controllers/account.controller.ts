"use client";

// Profil dan alias (saved NIK). Requirement: FR-30, BR-02. ADR-0011, ADR-0023 (halaman yang butuh akun meminta
// login sendiri; tidak ada redirect paksa dari proxy). Profil dari `GET /accounts/me` masih asumsi; bila gagal,
// halaman tetap tampil dengan email dan NIK dari sesi.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toAppError, type AppError } from "@/core/domain/app-error";
import { useDependencies } from "@/core/controllers/dependencies.context";
import { t, type MessageKey } from "@/core/i18n/t.utils";
import { intlLocale } from "@/core/i18n/locale.utils";
import { useSiteChrome } from "@/core/controllers/site-chrome.hook";
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
import { SAVED_NIK_LABEL_MAX_LENGTH, SAVED_NIK_NAME_MAX_LENGTH } from "../domain/auth.constants";
import { authErrorKey } from "./auth-error.mapper";
import { accountQuery, authKeys, profileQuery, savedNiksQuery } from "./auth.queries";
import type { AccountViewProps, AliasFormProps } from "../views/AccountView";

const savedNikErrors = {
  SAVED_NIK_REJECTED: "account.error.SAVED_NIK_REJECTED",
  NIK_INVALID: "account.error.NIK_INVALID",
  UNAUTHENTICATED: "account.error.UNAUTHENTICATED",
} as const;

const memberSinceFormat = () =>
  new Intl.DateTimeFormat(intlLocale(), {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  });

/** Form yang terbuka: tambah alias, atau ubah satu alias. Hanya satu form sekaligus. */
type FormMode = { kind: "create" } | { kind: "edit"; id: string };

/** Dua huruf awal untuk avatar: "Budi Santoso" → "BS", "you@example.com" → "Y". */
function initialsOf(name: string): string {
  const words = name
    .trim()
    .split(/[\s@._-]+/)
    .filter(Boolean);
  return words
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
}

type AccountModal =
  | { kind: NikDialogKind; target: FormMode }
  | { kind: "sessionExpired" }
  | { kind: "removeFailed"; id: string };

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
  if (error === "required") return t("account.saved.label.invalid");
  if (error === "too_long") return t("account.saved.label.tooLong", { max: SAVED_NIK_LABEL_MAX_LENGTH });
  return undefined;
}

function nameError(error: SavedNikInputError["name"]): string | undefined {
  if (error === "required") return t("account.saved.name.invalid");
  if (error === "too_long") return t("account.saved.name.tooLong", { max: SAVED_NIK_NAME_MAX_LENGTH });
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
    getProfileUseCase,
    listSavedNiksUseCase,
    addSavedNikUseCase,
    updateSavedNikUseCase,
    removeSavedNikUseCase,
    signOutUseCase,
  } = useDependencies<AuthDependencies>();
  const account = useQuery(accountQuery({ getAccountUseCase }));
  const signedIn = Boolean(account.data);
  const saved = useQuery({ ...savedNiksQuery({ listSavedNiksUseCase }), enabled: signedIn });
  const profile = useQuery({ ...profileQuery({ getProfileUseCase }), enabled: signedIn, retry: false });

  const [mode, setMode] = useState<FormMode>({ kind: "create" });
  const [label, setLabel] = useState("");
  const [name, setName] = useState("");
  const [nik, setNik] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [pendingRemove, setPendingRemove] = useState<SavedNik | null>(null);

  const resetForm = () => {
    setMode({ kind: "create" });
    setLabel("");
    setName("");
    setNik("");
    setSubmitted(false);
  };
  const refreshSaved = () => queryClient.invalidateQueries({ queryKey: authKeys.savedNiks });
  const save = useMutation({
    mutationFn: (target: FormMode) =>
      target.kind === "edit"
        ? updateSavedNikUseCase(target.id, { label, name, nik })
        : addSavedNikUseCase({ label, name, nik }),
    onSuccess: async () => {
      nikModal.close();
      resetForm();
      await refreshSaved();
    },
    onError: (error, target) => {
      const kind = saveDialogKindOf(toAppError(error));
      if (kind === "sessionExpired") nikModal.open({ kind });
      else if (kind) nikModal.open({ kind, target });
    },
  });
  const remove = useMutation({
    mutationFn: (id: string) => removeSavedNikUseCase(id),
    onSuccess: async (_, id) => {
      nikModal.close();
      setPendingRemove(null);
      if (mode.kind === "edit" && mode.id === id) resetForm();
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
      queryClient.setQueryData(authKeys.account, null);
      queryClient.removeQueries({ queryKey: authKeys.savedNiks });
      queryClient.removeQueries({ queryKey: authKeys.profile });
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
      onRetry: () => save.mutate(openModal.target),
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
  const invalid = submitted ? validateSavedNikInput({ label, name, nik }, { mode: mode.kind }) : null;

  const formFields = (editing: boolean): Pick<AliasFormProps, "label" | "name" | "nik"> => ({
    label: {
      label: t("account.saved.label.label"),
      placeholder: t("account.saved.label.placeholder"),
      value: label,
      error: labelError(invalid?.label),
      onChange: setLabel,
    },
    name: {
      label: t("account.saved.name.label"),
      placeholder: t("account.saved.name.placeholder"),
      value: name,
      error: nameError(invalid?.name),
      onChange: setName,
    },
    nik: {
      label: editing ? t("account.saved.nik.editLabel") : t("account.saved.nik.label"),
      placeholder: t("booking.holder.nik.placeholder"),
      hint: editing ? t("account.saved.nik.editHint") : undefined,
      value: nik,
      focusKey: focusNik || undefined,
      error: invalid?.nik ? t("register.nik.invalid") : undefined,
      // Hanya digit: spasi atau tanda baca dari salinan KTP dibuang.
      onChange: (value) => setNik(value.replace(/\D/g, "")),
    },
  });
  const submitFor = (target: FormMode): AliasFormProps["submit"] => ({
    label: save.isPending ? t("account.saved.saving") : t("account.saved.submit"),
    disabled: save.isPending,
    onSubmit: () => {
      setSubmitted(true);
      if (!validateSavedNikInput({ label, name, nik }, { mode: target.kind })) save.mutate(target);
    },
  });

  const editingId = mode.kind === "edit" ? mode.id : null;
  const profileData = profile.data;
  let errorKey: MessageKey | undefined;
  if (failed) errorKey = authErrorKey(toAppError(failed), savedNikErrors);
  const fields = [
    ...(profileData?.name ? [{ label: t("account.name.label"), value: profileData.name }] : []),
    { label: t("account.email.label"), value: profileData?.email ?? account.data.email },
    { label: t("account.nik.label"), value: profileData?.nikMasked ?? account.data.nikMasked },
    ...(profileData?.memberSince
      ? [
          {
            label: t("account.memberSince.label"),
            value: memberSinceFormat().format(new Date(profileData.memberSince)),
          },
        ]
      : []),
  ];

  const displayName = profileData?.name || account.data.email;
  return {
    ...page,
    kind: "ready",
    profile: {
      title: t("account.profile.title"),
      name: displayName,
      initials: initialsOf(displayName),
      email: profileData?.email ?? account.data.email,
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
        name: item.name ?? undefined,
        initials: initialsOf(item.label),
        nikMasked: item.nikMasked,
        edit: {
          text: t("account.saved.editShort"),
          label: t("account.saved.edit", { label: item.label }),
          onClick: () => {
            setMode({ kind: "edit", id: item.id });
            setLabel(item.label);
            setName(item.name ?? "");
            setNik("");
            setSubmitted(false);
            save.reset();
          },
        },
        remove: {
          text: t("account.saved.removeShort"),
          label: t("account.saved.remove", { label: item.label }),
          onClick: () => setPendingRemove(item),
        },
        form:
          editingId === item.id
            ? {
                id: `alias-${item.id}`,
                title: t("account.saved.edit.title", { label: item.label }),
                ...formFields(true),
                submit: submitFor({ kind: "edit", id: item.id }),
                cancel: { label: t("account.saved.cancel"), onClick: resetForm },
              }
            : undefined,
      })),
    },
    fullNotice: full && saved.data ? t("account.saved.full") : undefined,
    notice: t("account.notice"),
    add:
      (full && saved.data) || editingId
        ? undefined
        : {
            id: "alias-new",
            title: t("account.saved.add.title"),
            ...formFields(false),
            submit: submitFor({ kind: "create" }),
          },
    dialog,
    signOut: { label: t("account.signOut"), disabled: signOut.isPending, onClick: () => signOut.mutate() },
  };
}
