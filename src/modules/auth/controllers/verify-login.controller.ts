"use client";

// Layar `/login/verify`. Requirement: FR-29, BR-09. ADR-0023. Dua jalur masuk:
// 1. `?signedIn=1[&next=...]`: link email sudah ditukar di server oleh `GET /auth/login`, cookie akun sudah terpasang.
//    Layar hanya memastikan sesi ada, menampilkan sukses, dan menghitung mundur 5 detik ke tujuan (`next` disaring
//    `safeRedirectPath`). Tanpa sesi (URL diketik sendiri), jatuh ke layar gagal.
// 2. `#token=...` (usulan 1 dan 2: token di fragmen URL, dipakai lewat POST saat tombol ditekan, lalu ditukar dengan
//    cookie httpOnly oleh route same-origin).
// Desain: "Authentication — Login", state "Authenticated · return to the requested page".

import { useSyncExternalStore } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toAppError } from "@/core/domain/app-error";
import { useDependencies } from "@/core/controllers/dependencies.context";
import { t } from "@/core/i18n/t.utils";
import type { AuthDependencies } from "../application/auth.dependencies";
import { authErrorKey } from "./auth-error.mapper";
import { toLoginLinkFailedDialog } from "./auth-dialogs.mapper";
import { useSiteChrome } from "@/core/controllers/site-chrome.hook";
import { useModal } from "@/core/controllers/modal.hook";
import { refreshAfterSignIn } from "@/core/controllers/session.cache";
import { sessionAccountQuery } from "@/core/controllers/session.queries";
import type { CoreDependencies } from "@/core/application/core.dependencies";
import { useAutoRedirect } from "@/core/controllers/auto-redirect.hook";
import { safeRedirectPath } from "../domain/account.rules";
import { AUTO_REDIRECT_SECONDS } from "../domain/auth.constants";
import type { VerifyLoginViewProps } from "../views/VerifyLoginView";

const subscribeToHash = (onChange: () => void) => {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
};
// Fragmen tidak dikirim ke server, jadi token tidak tercatat di log akses maupun header Referer.
const readToken = () => new URLSearchParams(window.location.hash.slice(1)).get("token");
const noTokenOnServer = () => undefined;

const subscribeToLocation = (onChange: () => void) => {
  window.addEventListener("popstate", onChange);
  return () => window.removeEventListener("popstate", onChange);
};
// String mentah yang dibaca (primitif) supaya snapshot stabil; penguraiannya di luar `useSyncExternalStore`.
const readSearch = () => window.location.search;
const noSearchOnServer = () => undefined;

const eventDate = new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" });

export function useVerifyLoginController(): VerifyLoginViewProps {
  const siteChrome = useSiteChrome();
  const queryClient = useQueryClient();
  const { verifyLoginUseCase, getEventSummaryUseCase, getSessionAccountUseCase } = useDependencies<
    AuthDependencies & CoreDependencies
  >();
  const session = useQuery(sessionAccountQuery({ getSessionAccountUseCase }));
  // Desain "I / Already used": link sekali pakai sudah ditukar atau kedaluwarsa.
  const linkModal = useModal<{ kind: "linkFailed" }>();
  const token = useSyncExternalStore(subscribeToHash, readToken, noTokenOnServer);
  const search = useSyncExternalStore(subscribeToLocation, readSearch, noSearchOnServer);
  const params = search === undefined ? undefined : new URLSearchParams(search);
  const signedInArrival = params?.get("signedIn") === "1";
  const arrivalTarget = safeRedirectPath(params?.get("next") ?? null);
  const verify = useMutation({
    mutationFn: (value: string) => verifyLoginUseCase(value),
    onSuccess: () => refreshAfterSignIn(queryClient),
    onError: (error) => {
      const appError = toAppError(error);
      if (appError.kind === "api" && appError.code === "LOGIN_LINK_INVALID")
        linkModal.open({ kind: "linkFailed" });
    },
  });
  const eventId = verify.data?.booking?.eventId;
  const event = useQuery({
    queryKey: ["auth", "booking-event", eventId],
    queryFn: () => getEventSummaryUseCase(eventId ?? ""),
    enabled: Boolean(eventId),
  });
  // Berhasil masuk: setelah jeda singkat pelanggan diarahkan ke tujuannya (beranda, atau booking yang dipulihkan).
  // Hook tidak boleh bersyarat, jadi satu tujuan dihitung dari dua jalur: tiba dengan sesi, atau hasil tukar token.
  const redirectTarget = signedInArrival && session.data ? arrivalTarget : verify.data?.redirectPath;
  const redirectIn = useAutoRedirect(redirectTarget, AUTO_REDIRECT_SECONDS);
  const chrome = siteChrome;
  const requestNew = { label: t("verify.requestNew"), href: "/login" };

  // Link gagal tetapi perangkat ini sudah punya sesi (misalnya link diklik dua kali): lanjutkan dengan aman,
  // tanpa menampilkan galat. Token tidak pernah ditampilkan.
  if (verify.isError && session.data) {
    return {
      ...chrome,
      kind: "done",
      heading: t("verify.signedIn.heading"),
      message: t("verify.signedIn.message"),
      primary: { label: t("verify.done.explore"), href: "/" },
      secondary: { label: t("verify.signedIn.account"), href: "/account" },
    };
  }

  if (signedInArrival || search === undefined) {
    // Di server (query belum terbaca) dan selama sesi diperiksa, tampilkan status memverifikasi.
    if (search === undefined || session.isPending) {
      return {
        ...chrome,
        kind: "confirm",
        heading: t("verify.heading"),
        message: t("verify.verifying"),
        confirm: { label: t("verify.submit"), busy: true, onClick: () => undefined },
      };
    }
    if (session.data) {
      const explore = { label: t("verify.done.explore"), href: "/" };
      const hasBooking = arrivalTarget !== "/";
      return {
        ...chrome,
        kind: "done",
        heading: t("verify.done.heading"),
        message: t("verify.done.message"),
        redirectNote: t(hasBooking ? "verify.done.redirectBooking" : "verify.done.redirectHome", {
          seconds: redirectIn ?? AUTO_REDIRECT_SECONDS,
        }),
        primary: hasBooking ? { label: t("verify.done.returnToBooking"), href: arrivalTarget } : explore,
        secondary: hasBooking ? explore : undefined,
      };
    }
  }

  if (token === null || verify.isError) {
    const message = verify.isError
      ? t(authErrorKey(toAppError(verify.error), { LOGIN_LINK_INVALID: "verify.error.LOGIN_LINK_INVALID" }))
      : t("verify.missing");
    const dialog =
      linkModal.modal && !session.isPending
        ? toLoginLinkFailedDialog({ onDismiss: linkModal.close })
        : undefined;
    return { ...chrome, kind: "failed", heading: t("verify.failed.heading"), message, requestNew, dialog };
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
      redirectNote: t(hasBooking ? "verify.done.redirectBooking" : "verify.done.redirectHome", {
        seconds: redirectIn ?? AUTO_REDIRECT_SECONDS,
      }),
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
