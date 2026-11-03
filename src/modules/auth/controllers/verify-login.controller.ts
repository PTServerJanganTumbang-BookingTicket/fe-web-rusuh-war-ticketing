"use client";

// Konfirmasi link login dari email. Requirement: FR-29, BR-09. ADR-0023 (usulan 1 dan 2: token di fragmen URL,
// dipakai lewat POST saat tombol ditekan, lalu ditukar dengan cookie httpOnly oleh route same-origin).
// Desain: "Authentication — Login", state "Authenticated · return to the requested page".

import { useSyncExternalStore } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toAppError } from "@/core/domain/app-error";
import { useDependencies } from "@/core/controllers/dependencies.context";
import { t } from "@/core/i18n/t.utils";
import type { AuthDependencies } from "../application/auth.dependencies";
import { authErrorKey } from "./auth-error.mapper";
import { authKeys } from "./auth.queries";
import { toSiteChrome } from "@/core/controllers/site-chrome.utils";
import type { VerifyLoginViewProps } from "../views/VerifyLoginView";

const subscribeToHash = (onChange: () => void) => {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
};
// Fragmen tidak dikirim ke server, jadi token tidak tercatat di log akses maupun header Referer.
const readToken = () => new URLSearchParams(window.location.hash.slice(1)).get("token");
const noTokenOnServer = () => undefined;

const eventDate = new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" });

export function useVerifyLoginController(): VerifyLoginViewProps {
  const queryClient = useQueryClient();
  const { verifyLoginUseCase, getEventSummaryUseCase } = useDependencies<AuthDependencies>();
  const token = useSyncExternalStore(subscribeToHash, readToken, noTokenOnServer);
  const verify = useMutation({
    mutationFn: (value: string) => verifyLoginUseCase(value),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: authKeys.account }),
  });
  const eventId = verify.data?.booking?.eventId;
  const event = useQuery({
    queryKey: ["auth", "booking-event", eventId],
    queryFn: () => getEventSummaryUseCase(eventId ?? ""),
    enabled: Boolean(eventId),
  });
  const chrome = toSiteChrome();
  const requestNew = { label: t("verify.requestNew"), href: "/login" };

  if (token === null || verify.isError) {
    const message = verify.isError
      ? t(authErrorKey(toAppError(verify.error), { LOGIN_LINK_INVALID: "verify.error.LOGIN_LINK_INVALID" }))
      : t("verify.missing");
    return { ...chrome, kind: "failed", heading: t("verify.failed.heading"), message, requestNew };
  }

  if (verify.data) {
    const explore = { label: t("verify.done.explore"), href: "/" };
    const hasBooking = verify.data.redirectPath !== "/";
    return {
      ...chrome,
      kind: "done",
      heading: t("verify.done.heading"),
      message: t("verify.done.message"),
      // Kartu konteks hanya bila event berhasil dimuat; tanpa itu tombol kembali tetap berfungsi.
      booking: event.data
        ? {
            imageUrl: event.data.imageUrl,
            title: `${event.data.name} — ${event.data.city}`,
            detail: t("verify.done.event", {
              date: eventDate.format(new Date(event.data.date)),
              venue: event.data.venue,
            }),
            note: t("verify.done.context"),
          }
        : undefined,
      primary: hasBooking
        ? { label: t("verify.done.returnToBooking"), href: verify.data.redirectPath }
        : explore,
      secondary: hasBooking ? explore : undefined,
    };
  }

  const busy = token === undefined || verify.isPending;
  return {
    ...chrome,
    kind: "confirm",
    heading: t("verify.heading"),
    message: busy ? t("verify.verifying") : t("verify.message"),
    confirm: { label: t("verify.submit"), busy, onClick: () => token && verify.mutate(token) },
  };
}
