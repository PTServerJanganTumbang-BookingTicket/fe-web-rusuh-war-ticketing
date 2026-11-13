"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { hashKey, useQueryClient, type QueryKey } from "@tanstack/react-query";
import type { Observer, Unsubscribe } from "@/core/domain/live-updates.protocol";

/** Waktu menunggu stream tersambung sebelum dianggap tidak bisa dipakai (koneksi menggantung tanpa galat). */
export const LIVE_CONNECT_GRACE_MS = 3_000;

/**
 * `connecting`: stream baru dibuka dan belum gagal, jadi polling belum boleh jalan. `live`: tersambung.
 * `down`: stream gagal, putus, melewati batas tunggu, atau tidak dipakai; polling cadangan boleh jalan.
 */
export type LiveStatus = "connecting" | "live" | "down";

type LiveUpdatesOptions<T> = {
  queryKey: QueryKey;
  watch: (observer: Observer<T>) => Unsubscribe;
  /** Status akhir: stream ditutup supaya EventSource tidak menyambung ulang. */
  until?: (value: T) => boolean;
  /** Berlangganan hanya saat true (bawaan true). Dipakai bila stream baru boleh dibuka setelah langkah lain selesai. */
  enabled?: boolean;
  /** Batas tunggu sambungan pertama sebelum status menjadi `down` (bawaan `LIVE_CONNECT_GRACE_MS`). */
  graceMs?: number;
};

/**
 * Menulis pembaruan SSE ke cache TanStack Query (ADR-0016). Mengembalikan status stream; query options memakai
 * status ini untuk menahan polling selama `connecting`/`live` dan menyalakannya hanya saat `down`.
 * Selama `enabled` false stream tidak dibuka dan hasilnya `down`.
 */
export function useLiveUpdates<T>({
  queryKey,
  watch,
  until,
  enabled = true,
  graceMs = LIVE_CONNECT_GRACE_MS,
}: LiveUpdatesOptions<T>): LiveStatus {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<LiveStatus>("connecting");
  const latest = useRef({ queryKey, watch, until });
  useLayoutEffect(() => {
    latest.current = { queryKey, watch, until };
  });
  const key = hashKey(queryKey);

  useEffect(() => {
    if (!enabled) return;
    let done = false;
    const grace = setTimeout(() => {
      if (!done) setStatus((current) => (current === "connecting" ? "down" : current));
    }, graceMs);
    const stop = () => {
      done = true;
      clearTimeout(grace);
      unsubscribe();
      setStatus("connecting");
    };
    const unsubscribe = latest.current.watch({
      next: (value) => {
        queryClient.setQueryData(latest.current.queryKey, value);
        if (latest.current.until?.(value)) stop();
      },
      connected: () => {
        if (done) return;
        clearTimeout(grace);
        setStatus("live");
      },
      disconnected: () => {
        if (done) return;
        clearTimeout(grace);
        setStatus("down");
      },
    });
    return stop;
  }, [key, queryClient, enabled, graceMs]);

  return enabled ? status : "down";
}
