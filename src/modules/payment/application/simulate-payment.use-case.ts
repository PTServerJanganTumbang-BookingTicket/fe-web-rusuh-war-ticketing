/**
 * @file simulate-payment.use-case.ts
 * @description Simulate Payment Use Case
 *
 * Hanya mode mock: mensimulasikan hasil pembayaran seperti callback gateway.
 * Untuk keperluan testing dan demo (ADR-0009).
 */

import type { PaymentSimulatorProtocol } from "../domain/payment-simulator.protocol";

/* ========================================================================== */
/*                                   Types                                    */
/* ========================================================================== */

/** Outcome yang diizinkan untuk simulasi */
type SimulationOutcome = "PAID" | "FAILED";

/** Use case type untuk simulasi pembayaran */
export type SimulatePaymentUseCase = (bookingId: string, outcome: SimulationOutcome) => Promise<void>;

type SimulatePaymentDependencies = {
  readonly paymentSimulatorService: PaymentSimulatorProtocol;
};

/* ========================================================================== */
/*                              Use Case Factory                              */
/* ========================================================================== */

/**
 * Membuat use case untuk simulasi pembayaran.
 *
 * Hanya digunakan dalam mode mock untuk testing alur sukses dan gagal.
 *
 * @param deps - Dependencies yang dibutuhkan
 * @returns SimulatePaymentUseCase function
 */
export const createSimulatePaymentUseCase = ({
  paymentSimulatorService,
}: SimulatePaymentDependencies): SimulatePaymentUseCase => {
  return (bookingId: string, outcome: SimulationOutcome): Promise<void> => {
    return paymentSimulatorService.settle(bookingId, outcome);
  };
};
