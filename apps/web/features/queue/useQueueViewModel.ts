"use client";

// Waiting Room. Requirement: FR-06–10, NFR-05, NFR-06. Wireframe 9.2. ADR-0004 (polling), ADR-0010 (sesi), ADR-0017 (screen model).

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queuePositionQuery } from "@rusuh/api";
import { toAppError } from "@rusuh/core";
import { application } from "../shared/composition";
import { deriveQueueScreenState, type QueueScreenState } from "./queueModel";

export type QueueViewModel = {
  state: QueueScreenState;
  actions: { retryEnter: () => void };
};

export function useQueueViewModel(eventId: string): QueueViewModel {
  const router = useRouter();
  const query = useQuery(queuePositionQuery(eventId));
  const enter = useMutation({
    mutationFn: application.enterBookingRoom,
    onSuccess: (entered) => {
      if (entered) router.push(`/events/${eventId}/book`);
    },
  });

  // Giliran tiba: masuk otomatis sekali per token (FR-06–08). Tombol hanya cadangan bila menitipkan sesi gagal.
  const admitted = query.data?.status === "admitted" ? query.data : undefined;
  const enteredWith = useRef<string>(undefined);
  const { mutate } = enter;
  useEffect(() => {
    if (!admitted || enteredWith.current === admitted.accessToken) return;
    enteredWith.current = admitted.accessToken;
    mutate(admitted);
  }, [admitted, mutate]);

  return {
    state: deriveQueueScreenState({
      queue: query.data,
      error: query.isError ? toAppError(query.error) : undefined,
      enterError: enter.isError ? toAppError(enter.error) : undefined,
    }),
    actions: {
      retryEnter: () => {
        if (admitted) mutate(admitted);
      },
    },
  };
}
