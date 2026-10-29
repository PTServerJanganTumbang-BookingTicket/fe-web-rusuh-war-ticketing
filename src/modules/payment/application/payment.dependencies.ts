import type { GetOrderUseCase } from "./get-order.use-case";
import type { SimulatePaymentOutcomeUseCase } from "./simulate-payment-outcome.use-case";
import type { StartPaymentUseCase } from "./start-payment.use-case";
import type { WatchOrderUseCase } from "./watch-order.use-case";

export type PaymentDependencies = {
  getOrderUseCase: GetOrderUseCase;
  watchOrderUseCase: WatchOrderUseCase;
  startPaymentUseCase: StartPaymentUseCase;
  simulatePaymentOutcomeUseCase: SimulatePaymentOutcomeUseCase;
};
