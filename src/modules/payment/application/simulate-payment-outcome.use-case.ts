import type { Order, PaymentOutcome } from "../domain/order.model";
import type { PaymentSimulatorProtocol } from "../domain/payment-simulator.protocol";

export class SimulatePaymentOutcomeUseCase {
  private readonly paymentSimulatorService: PaymentSimulatorProtocol;

  constructor({ paymentSimulatorService }: { paymentSimulatorService: PaymentSimulatorProtocol }) {
    this.paymentSimulatorService = paymentSimulatorService;
  }

  execute(orderId: string, outcome: PaymentOutcome): Promise<Order> {
    return this.paymentSimulatorService.simulate(orderId, outcome);
  }
}
