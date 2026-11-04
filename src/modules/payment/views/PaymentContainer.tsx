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
  /** ID order yang akan dibayar */
  readonly orderId: string;
};

/* ========================================================================== */
/*                                Component                                   */
/* ========================================================================== */

/**
 * PaymentContainer - komponen container untuk halaman pembayaran.
 * Memilih antara PaymentView atau StatusView berdasarkan state controller.
 */
export const PaymentContainer = ({ orderId }: PaymentContainerProps) => {
  const screenState = usePaymentController(orderId);

  if (screenState.kind === "payment") {
    return <PaymentView {...screenState.view} />;
  }

  return <StatusView {...screenState.view} />;
};
