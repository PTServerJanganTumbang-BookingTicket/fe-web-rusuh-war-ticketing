import { isSettled, type AppError, type Order, type PaymentMethod } from "@rusuh/core";

// Kondisi layar Payment (ADR-0017). Murni dan tanpa i18n: teks dibentuk di toPaymentViewProps.

export type PaymentScreenState =
  | { kind: "loading" }
  | { kind: "failed"; error: AppError }
  /** Status akhir dari server (paid, failed, expired): layar hasil, tanpa timer. */
  | { kind: "settled"; order: Order }
  | {
      kind: "paying";
      order: Order;
      remainingMs: number;
      method: PaymentMethod;
      submitting: boolean;
      copied: boolean;
      /** Hanya ada saat API dimock: kontrol "Simulasikan berhasil/gagal". */
      simulation?: { busy: boolean };
    };

export type PaymentScreenInput = {
  order: Order | undefined;
  error: AppError | undefined;
  remainingMs: number | null;
  method: PaymentMethod;
  submitting: boolean;
  copied: boolean;
  simulation: { busy: boolean } | undefined;
};

export function derivePaymentScreenState({ order, error, remainingMs, ...paying }: PaymentScreenInput): PaymentScreenState {
  if (!order) return error ? { kind: "failed", error } : { kind: "loading" };
  if (isSettled(order)) return { kind: "settled", order };
  return {
    kind: "paying",
    order,
    // Timer belum siap di render pertama: tampil 00:00 sampai tick berikutnya. Keputusan expired tetap milik server.
    remainingMs: remainingMs ?? 0,
    method: paying.method,
    submitting: paying.submitting,
    copied: paying.copied,
    ...(paying.simulation && { simulation: paying.simulation }),
  };
}
