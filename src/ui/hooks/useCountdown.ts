"use client";

import { useEffect, useState } from "react";
import type { CoreDependencies } from "@/core/application/dependencies";
import { remainingMs } from "@/core/domain/time/remainingMs";
import { useCradle } from "../di/DependencyContext";

/** Sisa ms sampai `expiresAt` (jam server). Dihitung ulang dari jam tiap tick, bukan dikurangi (ADR-0005). */
export function useCountdown(expiresAt: string | undefined, offsetMs: number): number | null {
  const { clock } = useCradle<CoreDependencies>();
  const [now, setNow] = useState(() => clock.now());

  useEffect(() => {
    if (!expiresAt) return;
    const id = setInterval(() => setNow(clock.now()), 1000);
    return () => clearInterval(id);
  }, [expiresAt, clock]);

  return expiresAt ? remainingMs(expiresAt, now, offsetMs) : null;
}
