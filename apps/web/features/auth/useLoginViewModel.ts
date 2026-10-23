"use client";

// Login passwordless. Figma SJT ZAKI frame Login (email → link aman → kembali ke halaman tadi). ADR-0010 (sesi),
// ADR-0017 (screen model). Requirement: login wajib sebelum antre (jawaban klien).

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { emulateLastEmailLink, meQuery, queryKeys } from "@rusuh/api";
import { resolveReturnTo, serverOffsetMs, toAppError, type EmailProblem, type EmailLinkSent } from "@rusuh/core";
import { parseLoginReason } from "../shared/authRedirect";
import { application } from "../shared/composition";
import { useCountdown } from "../shared/useCountdown";
import { deriveLoginScreenState, type LoginScreenState } from "./loginModel";

// Kontrol simulasi hanya muncul saat API dimock; di backend asli link dibuka dari email.
const mocking = process.env.NEXT_PUBLIC_API_MOCKING === "enabled";

export type LoginViewModel = {
  state: LoginScreenState;
  actions: {
    changeEmail: (email: string) => void;
    submit: () => void;
    resend: () => void;
    editEmail: () => void;
    simulateOpenLink: () => void;
    proceed: () => void;
    logout: () => void;
  };
};

type Sent = { sent: EmailLinkSent; receivedAt: number };

export function useLoginViewModel({ returnTo, reason }: { returnTo: string | null; reason: string | null }): LoginViewModel {
  const router = useRouter();
  const queryClient = useQueryClient();
  const target = resolveReturnTo(returnTo);
  const me = useQuery(meQuery());

  const [email, setEmail] = useState("");
  const [problem, setProblem] = useState<EmailProblem>();
  const [sent, setSent] = useState<Sent>();

  const send = useMutation({
    mutationFn: (value: string) => application.requestLoginLink(value, target),
    onSuccess: (result) => {
      if (result.status === "invalid") return setProblem(result.problem);
      setProblem(undefined);
      setSent({ sent: result.sent, receivedAt: Date.now() });
    },
  });
  const logout = useMutation({
    mutationFn: application.logout,
    // `/me` dimuat ulang dan menjawab 401: layar kembali ke form.
    onSuccess: () => queryClient.resetQueries({ queryKey: queryKeys.me() }),
  });
  const openLink = useMutation({
    mutationFn: () => emulateLastEmailLink("login"),
    // Sama seperti link di email: token sekali pakai di URL callback, dihapus dari URL sebelum ditukar.
    onSuccess: (token) => router.push(`/auth/callback?${new URLSearchParams({ token, returnTo: target })}`),
  });

  const offsetMs = sent ? serverOffsetMs(Date.parse(sent.sent.serverNow), sent.receivedAt) : 0;
  const resendInMs = useCountdown(sent?.sent.resendAvailableAt, offsetMs);

  return {
    state: deriveLoginScreenState({
      account: me.data,
      checking: me.isPending,
      email,
      problem,
      sent: sent?.sent,
      sending: send.isPending,
      sendError: send.isError ? toAppError(send.error) : undefined,
      resendInMs,
      loggingOut: logout.isPending,
      reason: parseLoginReason(reason),
      simulation: mocking ? { busy: openLink.isPending } : undefined,
    }),
    actions: {
      changeEmail: (value) => {
        setEmail(value);
        setProblem(undefined);
      },
      submit: () => send.mutate(email),
      resend: () => {
        if (sent) send.mutate(sent.sent.email);
      },
      editEmail: () => {
        setSent(undefined);
        send.reset();
      },
      simulateOpenLink: () => openLink.mutate(),
      proceed: () => router.push(target),
      logout: () => logout.mutate(),
    },
  };
}
