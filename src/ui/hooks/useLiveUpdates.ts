"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { hashKey, useQueryClient, type QueryKey } from "@tanstack/react-query";
import type { Observer, Unsubscribe } from "@/core/application/LiveUpdates";

type LiveUpdatesOptions<T> = {
  queryKey: QueryKey;
  watch: (observer: Observer<T>) => Unsubscribe;
  /** Status akhir: stream ditutup supaya EventSource tidak menyambung ulang. */
  until?: (value: T) => boolean;
};

/**
 * Menulis pembaruan SSE ke cache TanStack Query (ADR-0016). Mengembalikan `true` selama stream tersambung;
 * query options memakai nilai ini untuk mematikan polling, dan menyalakannya lagi saat stream putus.
 */
export function useLiveUpdates<T>({ queryKey, watch, until }: LiveUpdatesOptions<T>): boolean {
  const queryClient = useQueryClient();
  const [live, setLive] = useState(false);
  const latest = useRef({ queryKey, watch, until });
  useLayoutEffect(() => {
    latest.current = { queryKey, watch, until };
  });
  const key = hashKey(queryKey);

  useEffect(() => {
    let done = false;
    const stop = () => {
      done = true;
      unsubscribe();
      setLive(false);
    };
    const unsubscribe = latest.current.watch({
      next: (value) => {
        queryClient.setQueryData(latest.current.queryKey, value);
        if (latest.current.until?.(value)) stop();
      },
      connected: () => {
        if (!done) setLive(true);
      },
      disconnected: () => setLive(false),
    });
    return stop;
  }, [key, queryClient]);

  return live;
}
