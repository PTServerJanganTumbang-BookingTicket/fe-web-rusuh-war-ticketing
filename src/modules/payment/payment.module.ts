import { asClass, type NameAndRegistrationPair } from "awilix";
import { GetOrder } from "./application/GetOrder";
import type { OrderRepository } from "./application/OrderRepository";
import type { OrderUpdates } from "./application/OrderUpdates";
import type { PaymentSimulator } from "./application/PaymentSimulator";
import { SimulatePaymentOutcome } from "./application/SimulatePaymentOutcome";
import { StartPayment } from "./application/StartPayment";
import { WatchOrder } from "./application/WatchOrder";
import type { PaymentDependencies } from "./application/dependencies";
import { HttpOrderRepository } from "./infrastructure/HttpOrderRepository";
import { HttpPaymentSimulator } from "./infrastructure/HttpPaymentSimulator";
import { SseOrderUpdates } from "./infrastructure/SseOrderUpdates";

export type PaymentCradle = PaymentDependencies & {
  orderRepository: OrderRepository;
  orderUpdates: OrderUpdates;
  paymentSimulator: PaymentSimulator;
};

export function paymentModule(): NameAndRegistrationPair<PaymentCradle> {
  return {
    orderRepository: asClass(HttpOrderRepository).singleton(),
    orderUpdates: asClass(SseOrderUpdates).singleton(),
    paymentSimulator: asClass(HttpPaymentSimulator).singleton(),
    getOrder: asClass(GetOrder).singleton(),
    watchOrder: asClass(WatchOrder).singleton(),
    startPayment: asClass(StartPayment).singleton(),
    simulatePaymentOutcome: asClass(SimulatePaymentOutcome).singleton(),
  };
}
