"use client";

// Profil dan alias (saved NIK). Requirement: FR-30, BR-02. ADR-0011, ADR-0023 (halaman yang butuh akun meminta
// login sendiri; tidak ada redirect paksa dari proxy). Profil dari `GET /accounts/me` masih asumsi; bila gagal,
// halaman tetap tampil dengan email dan NIK dari sesi.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toAppError } from "@/core/domain/app-error";
import { useDependencies } from "@/core/controllers/dependencies.context";
import { t, type MessageKey } from "@/core/i18n/t.utils";
import { useSiteChrome } from "@/core/controllers/site-chrome.hook";
import type { AuthDependencies } from "../application/auth.dependencies";
import type { SavedNik } from "../domain/account.model";
import { validateSavedNikInput, type SavedNikInputError } from "../domain/account.rules";
import { SAVED_NIK_LABEL_MAX_LENGTH } from "../domain/auth.constants";
import { authErrorKey } from "./auth-error.mapper";
import { accountQuery, authKeys, profileQuery, savedNiksQuery } from "./auth.queries";
import type { AccountViewProps, AliasFormProps } from "../views/AccountView";

const savedNikErrors = {
  SAVED_NIK_REJECTED: "account.error.SAVED_NIK_REJECTED",
  NIK_INVALID: "account.error.NIK_INVALID",
  UNAUTHENTICATED: "account.error.UNAUTHENTICATED",
} as const;

const memberSinceFormat = new Intl.DateTimeFormat("id-ID", {
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

function labelError(error: SavedNikInputError["label"]): string | undefined {
  if (error === "required") return t("account.saved.label.invalid");
  if (error === "too_long") return t("account.saved.label.tooLong", { max: SAVED_NIK_LABEL_MAX_LENGTH });
  return undefined;
}

export function useAccountController(): AccountViewProps {
  const siteChrome = useSiteChrome();
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
  const [nik, setNik] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [pendingRemove, setPendingRemove] = useState<SavedNik | null>(null);

  const resetForm = () => {
    setMode({ kind: "create" });
    setLabel("");
    setNik("");
    setSubmitted(false);
  };
  const refreshSaved = () => queryClient.invalidateQueries({ queryKey: authKeys.savedNiks });
  const save = useMutation({
    mutationFn: (target: FormMode) =>
      target.kind === "edit"
        ? updateSavedNikUseCase(target.id, { label, nik })
        : addSavedNikUseCase(nik, label),
    onSuccess: async () => {
      resetForm();
      await refreshSaved();
    },
  });
  const remove = useMutation({
    mutationFn: (id: string) => removeSavedNikUseCase(id),
    onSuccess: async (_, id) => {
      setPendingRemove(null);
      if (mode.kind === "edit" && mode.id === id) resetForm();
      await refreshSaved();
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
  const failed = save.error ?? remove.error ?? saved.error;
  const invalid = submitted ? validateSavedNikInput({ label, nik }, { mode: mode.kind }) : null;

  const formFields = (editing: boolean): Pick<AliasFormProps, "label" | "nik"> => ({
    label: {
      label: t("account.saved.label.label"),
      placeholder: t("account.saved.label.placeholder"),
      value: label,
      error: labelError(invalid?.label),
      onChange: setLabel,
    },
    nik: {
      label: editing ? t("account.saved.nik.editLabel") : t("account.saved.nik.label"),
      placeholder: t("booking.holder.nik.placeholder"),
      hint: editing ? t("account.saved.nik.editHint") : undefined,
      value: nik,
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
      if (!validateSavedNikInput({ label, nik }, { mode: target.kind })) save.mutate(target);
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
            value: memberSinceFormat.format(new Date(profileData.memberSince)),
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
        initials: initialsOf(item.label),
        nikMasked: item.nikMasked,
        edit: {
          text: t("account.saved.editShort"),
          label: t("account.saved.edit", { label: item.label }),
          onClick: () => {
            setMode({ kind: "edit", id: item.id });
            setLabel(item.label);
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
    confirmRemove: pendingRemove
      ? {
          title: t("account.saved.confirm.title"),
          description: t("account.saved.confirm.description", {
            label: pendingRemove.label,
            nik: pendingRemove.nikMasked,
          }),
          confirm: {
            label: remove.isPending ? t("account.saved.removing") : t("account.saved.confirm.cta"),
            onClick: () => remove.mutate(pendingRemove.id),
          },
          cancel: { label: t("account.saved.cancel"), onClick: () => setPendingRemove(null) },
          busy: remove.isPending,
        }
      : undefined,
    signOut: { label: t("account.signOut"), disabled: signOut.isPending, onClick: () => signOut.mutate() },
  };
}
