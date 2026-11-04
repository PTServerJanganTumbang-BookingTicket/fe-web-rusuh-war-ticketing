import { z } from "zod";
import type { HttpClient } from "@/core/data/http/http.client";
import type { PaymentSimulatorProtocol } from "../domain/payment-simulator.protocol";

/**
 * Memanggil `POST /payments/webhook` milik mock MSW. Di BE asli endpoint ini hanya untuk gateway (butuh tanda tangan),
 * jadi kontrol simulasi hanya dirender saat `NEXT_PUBLIC_API_MOCKING=enabled`.
 */
export function createHttpPaymentSimulatorService({
  httpClient,
}: {
  httpClient: HttpClient;
}): PaymentSimulatorProtocol {
  return {
    async settle(bookingId: string, outcome: "PAID" | "FAILED"): Promise<void> {
      await httpClient.post("/payments/webhook", { external_id: bookingId, status: outcome }, z.unknown(), {
        headers: { "x-callback-signature": "mock-signature" },
      });
    },
  };
}
