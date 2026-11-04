/**
 * @file order.model.ts
 * @description Payment Domain Models - API Contracts v2.1
 *
 * Requirements: 6.1, 6.3, 6.7, 6.11, 6.13, 6.16, BR-05
 * Source: POST /payments/{booking_id}, GET /payments/{id}/status, GET /payments/{id}/methods
 */

/* ========================================================================== */
/*                          Payment Method Types                              */
/* ========================================================================== */

/** Metode pembayaran yang didukung di POC */
export type PaymentMethod = "bank_transfer" | "gopay";

/** Kode bank untuk VA (Virtual Account) */
export type BankCode = "bca" | "bni" | "bri" | "cimb";

/* ========================================================================== */
/*                   Payment Instruction (Discriminated Union)                */
/* ========================================================================== */

/** Instruksi Virtual Account */
type BankTransferInstruction = {
  readonly type: "bank_transfer";
  readonly bank: BankCode;
  readonly vaNumber: string;
};

/** Instruksi GoPay QR */
type GopayInstruction = {
  readonly type: "gopay";
  readonly qrUrl: string;
  readonly deeplinkUrl: string;
};

/**
 * Instruksi pembayaran setelah metode dipilih.
 * Semua datang dari BE; FE tidak pernah memanggil Midtrans langsung (ADR-0006).
 */
export type PaymentInstruction = BankTransferInstruction | GopayInstruction;

/* ========================================================================== */
/*              Available Methods (GET /payments/{id}/methods)                */
/* ========================================================================== */

/** Bank option untuk metode bank_transfer */
export type BankOption = {
  readonly code: BankCode;
  readonly name: string;
  readonly iconUrl: string;
};

/** Metode pembayaran yang tersedia */
export type AvailableMethod = {
  readonly id: PaymentMethod;
  readonly name: string;
  readonly description: string;
  readonly iconUrl: string;
  /** false when circuit breaker OPEN */
  readonly enabled: boolean;
  /** Hanya untuk bank_transfer */
  readonly banks?: readonly BankOption[];
};

/* ========================================================================== */
/*            Payment Status (GET /payments/{id}/status polling)              */
/* ========================================================================== */

/** Status PENDING - masih menunggu pembayaran */
type PendingStatus = {
  readonly status: "PENDING";
  readonly serverTime: string;
  readonly ttlSeconds: number;
};

/** Status PAID - pembayaran berhasil */
type PaidStatus = {
  readonly status: "PAID";
  readonly paidAt: string;
  readonly redirectUrl: string;
};

/** Status FAILED - pembayaran gagal */
type FailedStatus = {
  readonly status: "FAILED";
  readonly reason: string;
  readonly canRetry: boolean;
  readonly attempt: number;
  readonly paymentExpiresAt: string;
  readonly serverTime: string;
};

/** Status EXPIRED - waktu habis */
type ExpiredStatus = {
  readonly status: "EXPIRED";
  readonly expiredAt: string;
};

/** Hasil polling status pembayaran */
export type PaymentStatusResult = PendingStatus | PaidStatus | FailedStatus | ExpiredStatus;

/* ========================================================================== */
/*                               Order Types                                  */
/* ========================================================================== */

/**
 * Status order pembayaran
 *
 * - PENDING_PAYMENT: customer belum bayar
 * - AWAITING_PAYMENT: payment initiated, menunggu konfirmasi gateway
 * - PENDING_CANCELLATION: TTL expired, grace period (show "verifying...")
 * - PAID: pembayaran berhasil
 * - FAILED: pembayaran gagal
 * - EXPIRED: waktu habis
 */
export type OrderStatus =
  "PENDING_PAYMENT" | "AWAITING_PAYMENT" | "PENDING_CANCELLATION" | "PAID" | "FAILED" | "EXPIRED";

/** Item dalam order */
export type OrderItem = {
  readonly category: string;
  readonly priceIdr: number;
  readonly nikMasked: string;
};

/** TTL pembayaran dengan waktu server */
export type PaymentTtl = {
  readonly expiresAt: string;
  readonly ttlSeconds: number;
  readonly serverTime: string;
};

/** Order detail lengkap */
export type Order = {
  readonly bookingId: string;
  /** ID event untuk kartu di samping ringkasan pesanan */
  readonly eventId: string;
  readonly eventName: string;
  readonly items: readonly OrderItem[];
  readonly totalIdr: number;
  readonly paymentTtl: PaymentTtl;
  readonly status: OrderStatus;
  /** Metode yang dipilih (jika sudah memilih) */
  readonly method?: PaymentMethod;
  /** Instruksi pembayaran (jika status AWAITING_PAYMENT) */
  readonly instruction?: PaymentInstruction;
  /** Nomor percobaan pembayaran saat ini */
  readonly attempt?: number;
};
