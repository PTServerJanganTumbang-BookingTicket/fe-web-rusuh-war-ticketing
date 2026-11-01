"use client";

import { useEffect, useState } from "react";
import type { CoreDependencies } from "@/core/application/core.dependencies";
import { remainingMs } from "@/core/domain/time/remaining-ms.utils";
import { useDependencies } from "./dependencies.context";

/** Sisa ms sampai `expiresAt` (jam server). Dihitung ulang dari jam tiap tick, bukan dikurangi (ADR-0005). */
export function useCountdown(expiresAt: string | undefined, offsetMs: number): number | null {
  const { clock } = useDependencies<CoreDependencies>();
  const [now, setNow] = useState(() => clock.now());

  useEffect(() => {
    if (!expiresAt) return;
    const id = setInterval(() => setNow(clock.now()), 1000);
    return () => clearInterval(id);
  }, [expiresAt, clock]);

  return expiresAt ? remainingMs(expiresAt, now, offsetMs) : null;
}
