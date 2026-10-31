import type { Order, PaymentOutcome } from "../domain/order.model";
import type { PaymentSimulatorProtocol } from "../domain/payment-simulator.protocol";

export type SimulatePaymentOutcomeUseCase = (orderId: string, outcome: PaymentOutcome) => Promise<Order>;

export function createSimulatePaymentOutcomeUseCase({
  paymentSimulatorService,
}: {
  paymentSimulatorService: PaymentSimulatorProtocol;
}): SimulatePaymentOutcomeUseCase {
  return (orderId, outcome) => paymentSimulatorService.simulate(orderId, outcome);
}
