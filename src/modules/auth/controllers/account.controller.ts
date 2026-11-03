"use client";

// Akun dan Daftar NIK Teman. Requirement: FR-30, BR-02. ADR-0011, ADR-0023 (halaman yang butuh akun meminta login
// sendiri; tidak ada redirect paksa dari proxy).

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toAppError } from "@/core/domain/app-error";
import { useDependencies } from "@/core/controllers/dependencies.context";
import { t } from "@/core/i18n/t.utils";
import type { AuthDependencies } from "../application/auth.dependencies";
import { isNikFormat } from "../domain/account.rules";
import { authErrorKey } from "./auth-error.mapper";
import { accountQuery, authKeys, savedNiksQuery } from "./auth.queries";
import type { AccountViewProps } from "../views/AccountView";

const savedNikErrors = {
  SAVED_NIK_REJECTED: "account.error.SAVED_NIK_REJECTED",
  NIK_INVALID: "account.error.NIK_INVALID",
  UNAUTHENTICATED: "account.error.UNAUTHENTICATED",
} as const;

export function useAccountController(): AccountViewProps {
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
  const refreshSaved = () => queryClient.invalidateQueries({ queryKey: authKeys.savedNiks });
  const add = useMutation({
    mutationFn: () => addSavedNikUseCase(nik, label),
    onSuccess: async () => {
      setLabel("");
      setNik("");
      setSubmitted(false);
      await refreshSaved();
    },
  });
  const remove = useMutation({
    mutationFn: (id: string) => removeSavedNikUseCase(id),
    onSuccess: refreshSaved,
  });
  const signOut = useMutation({
    mutationFn: () => signOutUseCase(),
    onSuccess: () => {
      queryClient.setQueryData(authKeys.account, null);
      queryClient.removeQueries({ queryKey: authKeys.savedNiks });
      router.push("/");
    },
  });
  const title = t("account.title");

  if (account.isPending || (signedIn && saved.isPending)) {
    return { kind: "loading", title, message: t("account.loading") };
  }
  if (!account.data) {
    return {
      kind: "signedOut",
      title,
      message: t("account.signedOut.message"),
      login: { label: t("account.signedOut.cta"), href: "/login" },
    };
  }

  const list = saved.data ?? { maxEntries: 0, savedNiks: [] };
  const full = list.savedNiks.length >= list.maxEntries;
  const failed = add.error ?? remove.error ?? saved.error;
  const errors = {
    label: submitted && label.trim() === "" ? t("account.saved.label.invalid") : undefined,
    nik: submitted && !isNikFormat(nik) ? t("register.nik.invalid") : undefined,
  };

  return {
    kind: "ready",
    title,
    profile: {
      emailLabel: t("account.email.label"),
      email: account.data.email,
      nikLabel: t("account.nik.label"),
      nikMasked: account.data.nikMasked,
    },
    saved: {
      title: t("account.saved.title"),
      hint: t("account.saved.hint", { count: list.savedNiks.length, max: list.maxEntries }),
      emptyLabel: t("account.saved.empty"),
      removeText: t("account.saved.removeShort"),
      error: failed ? t(authErrorKey(toAppError(failed), savedNikErrors)) : undefined,
      busy: remove.isPending,
      items: list.savedNiks.map((item) => ({
        id: item.id,
        label: item.label,
        nikMasked: item.nikMasked,
        removeLabel: t("account.saved.remove", { label: item.label }),
        onRemove: () => remove.mutate(item.id),
      })),
    },
    fullNotice: full && saved.data ? t("account.saved.full") : undefined,
    add:
      full && saved.data
        ? undefined
        : {
            title: t("account.saved.add.title"),
            label: {
              label: t("account.saved.label.label"),
              value: label,
              error: errors.label,
              onChange: setLabel,
            },
            nik: {
              label: t("account.saved.nik.label"),
              value: nik,
              error: errors.nik,
              onChange: (value) => setNik(value.replace(/\D/g, "")),
            },
            submit: {
              label: add.isPending ? t("account.saved.saving") : t("account.saved.submit"),
              disabled: add.isPending,
              onSubmit: () => {
                setSubmitted(true);
                if (label.trim() !== "" && isNikFormat(nik)) add.mutate();
              },
            },
          },
    signOut: { label: t("account.signOut"), disabled: signOut.isPending, onClick: () => signOut.mutate() },
  };
}
