"use client";

import { useEffect, useRef } from "react";

/**
 * Saat sisa waktu nol, FE tidak memutuskan sendiri: tanya server sekali per `expiresAt`, ikuti jawabannya (ADR-0005).
 */
export function useAskServerAtExpiry(expiresAt: string | undefined, remainingMs: number | null, ask: () => unknown): void {
  const askedFor = useRef<string>(undefined);
  useEffect(() => {
    if (!expiresAt || remainingMs !== 0 || askedFor.current === expiresAt) return;
    askedFor.current = expiresAt;
    void ask();
  }, [expiresAt, remainingMs, ask]);
}
