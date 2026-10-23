"use client";

// Membuka link login dari email. Figma SJT ZAKI (Login, Error I "Login link failed"). ADR-0010, ADR-0017.

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@rusuh/api";
import { resolveReturnTo, toAppError } from "@rusuh/core";
import { application } from "../shared/composition";
import { deriveAuthCallbackScreenState, type AuthCallbackScreenState } from "./authCallbackModel";

export type AuthCallbackViewModel = {
  state: AuthCallbackScreenState;
  actions: { requestNewLink: () => void };
};

export function useAuthCallbackViewModel({ token, returnTo }: { token: string | null; returnTo: string | null }): AuthCallbackViewModel {
  const router = useRouter();
  const queryClient = useQueryClient();
  const redeem = useMutation({
    mutationFn: () => application.redeemLoginLink(token, returnTo),
    onSuccess: async (target) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.me() });
      router.replace(target);
    },
  });

  // Token sekali pakai: ditukar tepat sekali (ref bertahan di Strict Mode) dan segera dihapus dari URL dan riwayat,
  // supaya tidak terbawa ke analytics, referrer, atau tombol kembali.
  const started = useRef(false);
  const { mutate } = redeem;
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    window.history.replaceState(null, "", window.location.pathname);
    mutate();
  }, [mutate]);

  return {
    state: deriveAuthCallbackScreenState(redeem.isError ? toAppError(redeem.error) : undefined),
    actions: {
      requestNewLink: () => router.replace(`/login?${new URLSearchParams({ returnTo: resolveReturnTo(returnTo) })}`),
    },
  };
}
