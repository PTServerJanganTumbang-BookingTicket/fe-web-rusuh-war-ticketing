/**
 * Payment Module - API Contracts v2.1
 *
 * DI registration for payment module components
 */

import { asFunction, type NameAndRegistrationPair } from "awilix";
import { createGetOrderUseCase } from "./application/get-order.use-case";
import { createGetAvailableMethodsUseCase } from "./application/get-available-methods.use-case";
import { createStartPaymentUseCase } from "./application/start-payment.use-case";
import { createRetryPaymentUseCase } from "./application/retry-payment.use-case";
import { createWatchOrderUseCase } from "./application/watch-order.use-case";
import type { PaymentDependencies } from "./application/payment.dependencies";
import type { OrderProtocol } from "./domain/order.protocol";
import { createHttpOrderService } from "./data/http-order.service";
import { createHttpPaymentSimulatorService } from "./data/http-payment-simulator.service";
import { createGetPaymentEventUseCase } from "./application/get-payment-event.use-case";
import { createSimulatePaymentUseCase } from "./application/simulate-payment.use-case";
import type { PaymentSimulatorProtocol } from "./domain/payment-simulator.protocol";

export type PaymentRegistry = PaymentDependencies & {
  orderService: OrderProtocol;
  paymentSimulatorService: PaymentSimulatorProtocol;
};

export function paymentModule(): NameAndRegistrationPair<PaymentRegistry> {
  return {
    // Services
    orderService: asFunction(createHttpOrderService).singleton(),
    paymentSimulatorService: asFunction(createHttpPaymentSimulatorService).singleton(),

    // Use cases
    getOrderUseCase: asFunction(createGetOrderUseCase).singleton(),
    getAvailableMethodsUseCase: asFunction(createGetAvailableMethodsUseCase).singleton(),
    startPaymentUseCase: asFunction(createStartPaymentUseCase).singleton(),
    retryPaymentUseCase: asFunction(createRetryPaymentUseCase).singleton(),
    watchOrderUseCase: asFunction(createWatchOrderUseCase).singleton(),
    getPaymentEventUseCase: asFunction(createGetPaymentEventUseCase).singleton(),
    simulatePaymentUseCase: asFunction(createSimulatePaymentUseCase).singleton(),
  };
}
