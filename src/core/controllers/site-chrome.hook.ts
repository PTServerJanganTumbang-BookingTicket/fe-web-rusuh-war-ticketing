"use client";

import { useQuery } from "@tanstack/react-query";
import type { CoreDependencies } from "@/core/application/core.dependencies";
import { useDependencies } from "./dependencies.context";
import { sessionAccountQuery } from "./session.queries";
import { toSiteChrome, type SiteChrome } from "./site-chrome.utils";

/**
 * Navbar dan footer dengan status masuk. Panggil di awal controller, sebelum early return. Selama sesi dimuat
 * atau gagal dimuat, navbar menampilkan tombol masuk; login tetap opsional (ADR-0023).
 */
export function useSiteChrome({ active }: { active?: string } = {}): SiteChrome {
  const { getSessionAccountUseCase } = useDependencies<CoreDependencies>();
  const session = useQuery(sessionAccountQuery({ getSessionAccountUseCase }));
  return toSiteChrome({ account: session.data, active });
}
