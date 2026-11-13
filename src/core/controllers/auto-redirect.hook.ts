"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Hitung mundur lalu pindah halaman otomatis (layar sukses: email terverifikasi, berhasil masuk).
 * Ini jeda tampilan, bukan TTL dari server, jadi dihitung dari tick lokal (ADR-0005 tidak berlaku).
 * `href` kosong berarti belum aktif. Mengembalikan sisa detik (untuk teks), atau `null` bila tidak aktif.
 */
export function useAutoRedirect(href: string | undefined, seconds: number): number | null {
  const router = useRouter();
  // Tick disimpan bersama href tujuannya, jadi tujuan baru memulai hitungan dari awal tanpa reset di effect.
  const [elapsed, setElapsed] = useState<{ href?: string; ticks: number }>({ ticks: 0 });
  const ticks = elapsed.href === href ? elapsed.ticks : 0;
  const remaining = href === undefined ? null : Math.max(seconds - ticks, 0);

  useEffect(() => {
    if (href === undefined) return;
    const id = setInterval(() => {
      setElapsed((current) => ({ href, ticks: (current.href === href ? current.ticks : 0) + 1 }));
    }, 1000);
    return () => clearInterval(id);
  }, [href]);

  // Sekali per tujuan: route tersembunyi yang tampil lagi menjalankan ulang efek dengan hitungan yang sudah nol
  // (ADR-0007) dan akan melempar customer pergi lagi.
  const redirectedTo = useRef<string>(undefined);
  useEffect(() => {
    if (href === undefined) {
      redirectedTo.current = undefined;
      return;
    }
    if (remaining !== 0 || redirectedTo.current === href) return;
    redirectedTo.current = href;
    router.replace(href);
  }, [href, remaining, router]);

  return remaining;
}
