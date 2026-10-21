"use client";

import { useEffect, useState } from "react";
import { remainingMs } from "@rusuh/core";

/** Sisa ms sampai `expiresAt` (jam server). Dihitung ulang dari jam sistem tiap tick, bukan dikurangi (ADR-0005). */
export function useCountdown(expiresAt: string | undefined, offsetMs: number): number | null {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!expiresAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  return expiresAt ? remainingMs(expiresAt, now, offsetMs) : null;
}
