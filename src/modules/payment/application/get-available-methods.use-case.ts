/**
 * @file get-available-methods.use-case.ts
 * @description Get Available Methods Use Case - API Contracts v2.1
 *
 * Requirements: 6.11 (list available payment methods)
 */

import type { AvailableMethod } from "../domain/order.model";
import type { OrderProtocol } from "../domain/order.protocol";

/* ========================================================================== */
/*                                   Types                                    */
/* ========================================================================== */

/** Use case type untuk mengambil metode pembayaran yang tersedia */
export type GetAvailableMethodsUseCase = (bookingId: string) => Promise<AvailableMethod[]>;

type GetAvailableMethodsDependencies = {
  readonly orderService: OrderProtocol;
};

/* ========================================================================== */
/*                              Use Case Factory                              */
/* ========================================================================== */

/**
 * Membuat use case untuk mengambil daftar metode pembayaran yang tersedia.
 *
 * Returns methods with enabled status based on circuit breaker state.
 *
 * @param deps - Dependencies yang dibutuhkan
 * @returns GetAvailableMethodsUseCase function
 */
export const createGetAvailableMethodsUseCase = ({
  orderService,
}: GetAvailableMethodsDependencies): GetAvailableMethodsUseCase => {
  return (bookingId: string): Promise<AvailableMethod[]> => {
    return orderService.getAvailableMethods(bookingId);
  };
};
