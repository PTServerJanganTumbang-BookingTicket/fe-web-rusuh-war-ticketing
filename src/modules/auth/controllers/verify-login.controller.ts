"use client";

// Konfirmasi link login dari email. Requirement: FR-29, BR-09. ADR-0023 (usulan 1 dan 2: token di fragmen URL,
// dipakai lewat POST saat tombol ditekan, lalu ditukar dengan cookie httpOnly oleh route same-origin).

import { useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toAppError } from "@/core/domain/app-error";
import { useDependencies } from "@/core/controllers/dependencies.context";
import { t } from "@/core/i18n/t.utils";
import type { AuthDependencies } from "../application/auth.dependencies";
import { authErrorKey } from "./auth-error.mapper";
import { authKeys } from "./auth.queries";
import type { VerifyLoginViewProps } from "../views/VerifyLoginView";

const subscribeToHash = (onChange: () => void) => {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
};
// Fragmen tidak dikirim ke server, jadi token tidak tercatat di log akses maupun header Referer.
const readToken = () => new URLSearchParams(window.location.hash.slice(1)).get("token");
const noTokenOnServer = () => undefined;

export function useVerifyLoginController(): VerifyLoginViewProps {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { verifyLoginUseCase } = useDependencies<AuthDependencies>();
  const token = useSyncExternalStore(subscribeToHash, readToken, noTokenOnServer);
  const verify = useMutation({
    mutationFn: (value: string) => verifyLoginUseCase(value),
    onSuccess: async ({ redirectPath }) => {
      await queryClient.invalidateQueries({ queryKey: authKeys.account });
      router.replace(redirectPath);
    },
  });
  const title = t("verify.title");
  const requestNew = { label: t("verify.requestNew"), href: "/login" };

  if (token === undefined) return { title, message: t("verify.verifying") };
  if (!token) return { title, message: "", error: t("verify.missing"), requestNew };
  if (verify.isError) {
    const key = authErrorKey(toAppError(verify.error), {
      LOGIN_LINK_INVALID: "verify.error.LOGIN_LINK_INVALID",
    });
    return { title, message: "", error: t(key), requestNew };
  }

  const busy = verify.isPending || verify.isSuccess;
  return {
    title,
    message: busy ? t("verify.verifying") : t("verify.message"),
    confirm: { label: t("verify.submit"), disabled: busy, onClick: () => verify.mutate(token) },
  };
}
