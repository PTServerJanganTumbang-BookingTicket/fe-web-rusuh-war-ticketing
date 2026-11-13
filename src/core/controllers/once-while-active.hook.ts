"use client";

import { useEffect, useRef } from "react";

/**
 * Menjalankan `action` sekali ketika `active` menjadi true, dan tidak lagi selama `active` terus true.
 *
 * Route yang ditinggalkan disembunyikan Next, bukan dilepas (ADR-0007): saat tampil lagi, semua efek dijalankan
 * ulang dengan nilai render terakhir sebelum disembunyikan. Tanpa penjaga ini efek "waktu habis" berjalan lagi
 * terhadap grant baru hasil antri ulang (melepas grant itu dan melempar customer ke Beranda).
 */
export function useOnceWhileActive(active: boolean, action: () => void): void {
  const fired = useRef(false);
  useEffect(() => {
    if (!active) {
      fired.current = false;
      return;
    }
    if (fired.current) return;
    fired.current = true;
    action();
  }, [active, action]);
}
