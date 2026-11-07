"use client";

/**
 * @file PaymentContainer.tsx
 * @description Container component untuk halaman pembayaran.
 * Menentukan tampilan berdasarkan state dari payment controller.
 */

import { StatusView } from "@/components/ui/layout/StatusView";
import { usePaymentController } from "../controllers/payment.controller";
import { PaymentView } from "./PaymentView";

/* ========================================================================== */
/*                                   Types                                    */
/* ========================================================================== */

type PaymentContainerProps = {
  /**
   * ID booking yang akan dibayar.
   * Note: Ini adalah `bookingId` dalam API contract, meskipun route param
   * mungkin menamakannya `orderId` untuk backward compatibility.
   */
  readonly bookingId: string;
};

/* ========================================================================== */
/*                                Component                                   */
/* ========================================================================== */

/**
 * PaymentContainer - komponen container untuk halaman pembayaran.
 * Memilih antara PaymentView atau StatusView berdasarkan state controller.
 */
export const PaymentContainer = ({ bookingId }: PaymentContainerProps) => {
  const screenState = usePaymentController(bookingId);

  if (screenState.kind === "payment") {
    return <PaymentView {...screenState.view} />;
  }

  return <StatusView {...screenState.view} />;
};
