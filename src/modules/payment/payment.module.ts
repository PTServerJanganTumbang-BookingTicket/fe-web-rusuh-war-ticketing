import { asClass, type NameAndRegistrationPair } from "awilix";
import { GetOrderUseCase } from "./application/get-order.use-case";
import type { OrderProtocol } from "./domain/order.protocol";
import type { OrderUpdatesProtocol } from "./domain/order-updates.protocol";
import type { PaymentSimulatorProtocol } from "./domain/payment-simulator.protocol";
import { SimulatePaymentOutcomeUseCase } from "./application/simulate-payment-outcome.use-case";
import { StartPaymentUseCase } from "./application/start-payment.use-case";
import { WatchOrderUseCase } from "./application/watch-order.use-case";
import type { PaymentDependencies } from "./application/payment.dependencies";
import { HttpOrderService } from "./data/http-order.service";
import { HttpPaymentSimulatorService } from "./data/http-payment-simulator.service";
import { SseOrderUpdatesService } from "./data/sse-order-updates.service";

export type PaymentRegistry = PaymentDependencies & {
  orderService: OrderProtocol;
  orderUpdatesService: OrderUpdatesProtocol;
  paymentSimulatorService: PaymentSimulatorProtocol;
};

export function paymentModule(): NameAndRegistrationPair<PaymentRegistry> {
  return {
    orderService: asClass(HttpOrderService).singleton(),
    orderUpdatesService: asClass(SseOrderUpdatesService).singleton(),
    paymentSimulatorService: asClass(HttpPaymentSimulatorService).singleton(),
    getOrderUseCase: asClass(GetOrderUseCase).singleton(),
    watchOrderUseCase: asClass(WatchOrderUseCase).singleton(),
    startPaymentUseCase: asClass(StartPaymentUseCase).singleton(),
    simulatePaymentOutcomeUseCase: asClass(SimulatePaymentOutcomeUseCase).singleton(),
  };
}
