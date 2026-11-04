import type { PaymentSimulatorProtocol } from "../domain/payment-simulator.protocol";

export type SimulatePaymentUseCase = (bookingId: string, outcome: "PAID" | "FAILED") => Promise<void>;

/** Hanya mode mock: hasil pembayaran seperti callback gateway (ADR-0009, skenario demo). */
export function createSimulatePaymentUseCase({
  paymentSimulatorService,
}: {
  paymentSimulatorService: PaymentSimulatorProtocol;
}): SimulatePaymentUseCase {
  return (bookingId, outcome) => paymentSimulatorService.settle(bookingId, outcome);
}
