/**
 * Get Available Methods Use Case - API Contracts v2.1
 *
 * Requirements: 6.11 (list available payment methods)
 */

import type { AvailableMethod } from "../domain/order.model";
import type { OrderProtocol } from "../domain/order.protocol";

export type GetAvailableMethodsUseCase = (bookingId: string) => Promise<AvailableMethod[]>;

/**
 * Get available payment methods for a booking.
 * Returns methods with enabled status based on circuit breaker state.
 */
export function createGetAvailableMethodsUseCase({
  orderService,
}: {
  orderService: OrderProtocol;
}): GetAvailableMethodsUseCase {
  return (bookingId) => orderService.getAvailableMethods(bookingId);
}
