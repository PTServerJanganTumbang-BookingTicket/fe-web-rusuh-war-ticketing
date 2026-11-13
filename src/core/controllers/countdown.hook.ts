"use client";

import { useEffect, useReducer } from "react";
import type { CoreDependencies } from "@/core/application/core.dependencies";
import { remainingMs } from "@/core/domain/time/remaining-ms.utils";
import { useDependencies } from "./dependencies.context";

/**
 * Sisa ms sampai `expiresAt` (jam server). Dihitung ulang dari jam tiap render, bukan dikurangi (ADR-0005).
 * Jam dibaca saat render, bukan disimpan di state: state yang tertinggal (mount sebelum data tiba, atau route
 * tersembunyi yang dibuka lagi) membuat nilai pertama terlalu besar sampai tick berikutnya.
 * `null` selama `expiresAt` belum ada, jadi layar menampilkan loading, bukan angka tebakan.
 */
export function useCountdown(expiresAt: string | undefined, offsetMs: number): number | null {
  const { clock } = useDependencies<CoreDependencies>();
  const [, tick] = useReducer((count: number) => count + 1, 0);

  useEffect(() => {
    if (!expiresAt) return;
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  return expiresAt ? remainingMs(expiresAt, clock.now(), offsetMs) : null;
}
