"use client";

/**
 * Event Detail Controller — halaman `/events/{eventId}`.
 * Requirement: FR-11, FR-12 (detail event dan kategori tiket), FR-03a..e (status jual dari server), Req 1.4
 * (status segar ≤5 detik). Kontrak API §2.2. ADR-0004 (TanStack Query), ADR-0007 (shell statis + data klien).
 * Wireframe: belum ada untuk layar ini; isi mengikuti kartu event Home (9.1) dan kartu event alur pembelian.
 */

import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { CoreDependencies } from "@/core/application/core.dependencies";
import { useDependencies } from "@/core/controllers/dependencies.context";
import { useSiteChrome } from "@/core/controllers/site-chrome.hook";
import { toAppError } from "@/core/domain/app-error";
import { t } from "@/core/i18n/t.utils";
import type { CatalogDependencies } from "../application/catalog.dependencies";
import type { EventDetailStatusViewProps } from "../views/EventDetailStatusView";
import type { EventDetailViewProps } from "../views/EventDetailView";
import { eventDetailQueryOptions, isEventNotFound } from "./catalog.queries";
import { toEventDetailViewProps } from "./event-detail.mapper";

export type EventDetailScreen =
  | { kind: "loading"; view: Pick<EventDetailViewProps, "nav" | "footer"> & { label: string } }
  | { kind: "ready"; view: EventDetailViewProps }
  | { kind: "notFound"; view: EventDetailStatusViewProps }
  | { kind: "error"; view: EventDetailStatusViewProps };

export function useEventDetailController(eventId: string): EventDetailScreen {
  const { getEventUseCase, random, captcha } = useDependencies<CatalogDependencies & CoreDependencies>();
  const { nav, footer } = useSiteChrome();
  // Opsi dimemoisasi supaya jitter polling tetap sama antar render (lihat `eventDetailQueryOptions`).
  const options = useMemo(
    () => eventDetailQueryOptions({ getEventUseCase, random }, eventId),
    [getEventUseCase, random, eventId],
  );
  const query = useQuery(options);

  // Halaman ini hanya satu klik dari antrian: selesaikan CAPTCHA di latar supaya Waiting Room tidak menunggunya.
  const { display, captcha: captchaConfig } = query.data ?? {};
  const canJoin = display?.enabled === true && display.action === "queue";
  const provider = captchaConfig?.provider;
  const siteKey = captchaConfig?.siteKey;
  useEffect(() => {
    if (!canJoin) return;
    captcha.warm();
    if (provider !== undefined && siteKey !== undefined) captcha.presolve(eventId, { provider, siteKey });
  }, [canJoin, captcha, eventId, provider, siteKey]);

  // Data terakhir tetap tampil walau penyegaran berikutnya gagal; layar galat hanya bila belum ada data sama sekali.
  if (query.data) return { kind: "ready", view: { nav, footer, ...toEventDetailViewProps(query.data) } };

  if (!query.error) return { kind: "loading", view: { nav, footer, label: t("common.loading") } };

  const home = { label: t("eventDetail.notFound.home"), href: "/" };
  if (isEventNotFound(toAppError(query.error))) {
    return {
      kind: "notFound",
      view: {
        nav,
        footer,
        illustration: "box",
        title: t("eventDetail.notFound.title"),
        description: t("eventDetail.notFound.description"),
        home,
      },
    };
  }
  return {
    kind: "error",
    view: {
      nav,
      footer,
      illustration: "error",
      title: t("eventDetail.error.title"),
      description: t("eventDetail.error.description"),
      home,
      retry: {
        label: t(query.isFetching ? "home.retrying" : "home.retry"),
        busy: query.isFetching,
        onClick: () => void query.refetch(),
      },
    },
  };
}
