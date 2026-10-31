import { asFunction, type NameAndRegistrationPair } from "awilix";
import { createGetOrderUseCase } from "./application/get-order.use-case";
import type { OrderProtocol } from "./domain/order.protocol";
import type { OrderUpdatesProtocol } from "./domain/order-updates.protocol";
import type { PaymentSimulatorProtocol } from "./domain/payment-simulator.protocol";
import { createSimulatePaymentOutcomeUseCase } from "./application/simulate-payment-outcome.use-case";
import { createStartPaymentUseCase } from "./application/start-payment.use-case";
import { createWatchOrderUseCase } from "./application/watch-order.use-case";
import type { PaymentDependencies } from "./application/payment.dependencies";
import { createHttpOrderService } from "./data/http-order.service";
import { createHttpPaymentSimulatorService } from "./data/http-payment-simulator.service";
import { createSseOrderUpdatesService } from "./data/sse-order-updates.service";

export type PaymentRegistry = PaymentDependencies & {
  orderService: OrderProtocol;
  orderUpdatesService: OrderUpdatesProtocol;
  paymentSimulatorService: PaymentSimulatorProtocol;
};

export function paymentModule(): NameAndRegistrationPair<PaymentRegistry> {
  return {
    orderService: asFunction(createHttpOrderService).singleton(),
    orderUpdatesService: asFunction(createSseOrderUpdatesService).singleton(),
    paymentSimulatorService: asFunction(createHttpPaymentSimulatorService).singleton(),
    getOrderUseCase: asFunction(createGetOrderUseCase).singleton(),
    watchOrderUseCase: asFunction(createWatchOrderUseCase).singleton(),
    startPaymentUseCase: asFunction(createStartPaymentUseCase).singleton(),
    simulatePaymentOutcomeUseCase: asFunction(createSimulatePaymentOutcomeUseCase).singleton(),
  };
}
