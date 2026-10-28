import type { Order, PaymentOutcome } from "../domain/order";
import type { PaymentSimulator } from "./PaymentSimulator";

export class SimulatePaymentOutcome {
  private readonly paymentSimulator: PaymentSimulator;

  constructor({ paymentSimulator }: { paymentSimulator: PaymentSimulator }) {
    this.paymentSimulator = paymentSimulator;
  }

  execute(orderId: string, outcome: PaymentOutcome): Promise<Order> {
    return this.paymentSimulator.simulate(orderId, outcome);
  }
}
