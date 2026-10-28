import type { GetOrder } from "./GetOrder";
import type { SimulatePaymentOutcome } from "./SimulatePaymentOutcome";
import type { StartPayment } from "./StartPayment";
import type { WatchOrder } from "./WatchOrder";

export type PaymentDependencies = {
  getOrder: GetOrder;
  watchOrder: WatchOrder;
  startPayment: StartPayment;
  simulatePaymentOutcome: SimulatePaymentOutcome;
};
