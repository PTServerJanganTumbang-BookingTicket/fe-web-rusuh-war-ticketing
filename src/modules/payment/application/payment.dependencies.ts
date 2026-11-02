/**
 * Payment module dependencies - API Contracts v2.1
 */

import type { GetOrderUseCase } from "./get-order.use-case";
import type { GetAvailableMethodsUseCase } from "./get-available-methods.use-case";
import type { StartPaymentUseCase } from "./start-payment.use-case";
import type { RetryPaymentUseCase } from "./retry-payment.use-case";
import type { WatchOrderUseCase } from "./watch-order.use-case";

export type PaymentDependencies = {
  getOrderUseCase: GetOrderUseCase;
  getAvailableMethodsUseCase: GetAvailableMethodsUseCase;
  startPaymentUseCase: StartPaymentUseCase;
  retryPaymentUseCase: RetryPaymentUseCase;
  watchOrderUseCase: WatchOrderUseCase;
};
