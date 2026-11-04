/**
 * @file get-order.use-case.ts
 * @description Get Order Use Case - API Contracts v2.1
 *
 * Requirements: 6.12 (polling status), 6.2 (order summary)
 */

import type { Order } from "../domain/order.model";
import type { OrderProtocol } from "../domain/order.protocol";

/* ========================================================================== */
/*                                   Types                                    */
/* ========================================================================== */

/** Use case type untuk mengambil detail order */
export type GetOrderUseCase = (bookingId: string) => Promise<Order>;

type GetOrderDependencies = {
  readonly orderService: OrderProtocol;
};

/* ========================================================================== */
/*                              Use Case Factory                              */
/* ========================================================================== */

/**
 * Membuat use case untuk mengambil detail order.
 *
 * @param deps - Dependencies yang dibutuhkan
 * @returns GetOrderUseCase function
 */
export const createGetOrderUseCase = ({ orderService }: GetOrderDependencies): GetOrderUseCase => {
  return (bookingId: string): Promise<Order> => {
    return orderService.getOrder(bookingId);
  };
};
