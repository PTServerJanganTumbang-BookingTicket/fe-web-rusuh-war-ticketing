/**
 * @file http-payment-simulator.service.ts
 * @description HTTP service untuk simulasi pembayaran (mock mode only).
 *
 * Memanggil POST /payments/webhook milik mock MSW.
 * Di backend asli, endpoint ini hanya untuk gateway (butuh tanda tangan),
 * jadi kontrol simulasi hanya dirender saat NEXT_PUBLIC_API_MOCKING=enabled.
 */

import { z } from "zod";
import type { HttpClient } from "@/core/data/http/http.client";
import type { PaymentSimulatorProtocol } from "../domain/payment-simulator.protocol";

/* ========================================================================== */
/*                                   Types                                    */
/* ========================================================================== */

type HttpPaymentSimulatorDependencies = {
  readonly httpClient: HttpClient;
};

/** Outcome yang diizinkan untuk simulasi */
type SimulationOutcome = "PAID" | "FAILED";

/* ========================================================================== */
/*                              Service Factory                               */
/* ========================================================================== */

/**
 * Membuat HTTP service untuk simulasi pembayaran.
 * Hanya digunakan dalam mode mock untuk testing dan demo.
 */
export const createHttpPaymentSimulatorService = ({
  httpClient,
}: HttpPaymentSimulatorDependencies): PaymentSimulatorProtocol => {
  /**
   * Mensimulasikan hasil pembayaran seperti callback dari payment gateway.
   *
   * @param bookingId - ID booking yang akan disimulasikan
   * @param outcome - Hasil simulasi: PAID (sukses) atau FAILED (gagal)
   */
  const settle = async (bookingId: string, outcome: SimulationOutcome): Promise<void> => {
    const webhookPath = "/payments/webhook";
    const requestBody = {
      external_id: bookingId,
      status: outcome,
    };
    const requestOptions = {
      headers: {
        "x-callback-signature": "mock-signature",
      },
    };

    // Response diabaikan, yang penting request berhasil
    await httpClient.post(webhookPath, requestBody, z.unknown(), requestOptions);
  };

  return {
    settle,
  };
};
