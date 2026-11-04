/**
 * Payment domain models - API Contracts v2.1
 *
 * Requirements: 6.1, 6.3, 6.7, 6.11, 6.13, 6.16, BR-05
 * Source: POST /payments/{booking_id}, GET /payments/{id}/status, GET /payments/{id}/methods
 */

// =============================================================================
// Payment Method Types
// =============================================================================

/** Metode pembayaran yang didukung di POC */
export type PaymentMethod = "bank_transfer" | "gopay";

/** Kode bank untuk VA (Virtual Account) */
export type BankCode = "bca" | "bni" | "bri" | "cimb";

// =============================================================================
// Payment Instruction (discriminated union)
// =============================================================================

/** Instruksi pembayaran setelah metode dipilih. Semua datang dari BE; FE tidak pernah memanggil Midtrans (ADR-0006). */
export type PaymentInstruction =
  | { type: "bank_transfer"; bank: BankCode; vaNumber: string }
  | { type: "gopay"; qrUrl: string; deeplinkUrl: string };

// =============================================================================
// Available Methods (from GET /payments/{id}/methods)
// =============================================================================

/** Bank option untuk metode bank_transfer */
export type BankOption = {
  code: BankCode;
  name: string;
  iconUrl: string;
};

/** Metode pembayaran yang tersedia */
export type AvailableMethod = {
  id: PaymentMethod;
  name: string;
  description: string;
  iconUrl: string;
  enabled: boolean; // false when circuit breaker OPEN
  banks?: BankOption[]; // Only for bank_transfer
};

// =============================================================================
// Payment Status (from GET /payments/{id}/status polling)
// =============================================================================

/** Hasil polling status pembayaran */
export type PaymentStatusResult =
  | { status: "PENDING"; serverTime: string; ttlSeconds: number }
  | { status: "PAID"; paidAt: string; redirectUrl: string }
  | {
      status: "FAILED";
      reason: string;
      canRetry: boolean;
      attempt: number;
      paymentExpiresAt: string;
      serverTime: string;
    }
  | { status: "EXPIRED"; expiredAt: string };

// =============================================================================
// Order Types
// =============================================================================

/** Status order pembayaran */
export type OrderStatus =
  | "PENDING_PAYMENT" // booking status: customer hasn't paid yet
  | "AWAITING_PAYMENT" // payment initiated, waiting gateway confirmation
  | "PENDING_CANCELLATION" // TTL expired, grace period (show "verifying...")
  | "PAID"
  | "FAILED"
  | "EXPIRED";

/** Item dalam order */
export type OrderItem = {
  category: string;
  priceIdr: number;
  nikMasked: string;
};

/** TTL pembayaran dengan waktu server */
export type PaymentTtl = {
  expiresAt: string;
  ttlSeconds: number;
  serverTime: string;
};

/** Order detail lengkap */
export type Order = {
  bookingId: string;
  /** Untuk kartu event di samping ringkasan pesanan. */
  eventId: string;
  eventName: string;
  items: OrderItem[];
  totalIdr: number;
  paymentTtl: PaymentTtl;
  status: OrderStatus;
  method?: PaymentMethod;
  instruction?: PaymentInstruction;
  attempt?: number;
};
