export type PaymentMethod = "virtual_account" | "e_wallet" | "bank_transfer";

/** Cara membayar setelah metode dipilih. Semua datang dari BE; FE tidak pernah memanggil Midtrans (ADR-0006). */
export type PaymentInstruction =
  | { type: "virtual_account"; bank: string; number: string }
  | { type: "qr"; payload: string }
  | { type: "bank_transfer"; bank: string; account: string; accountName: string };

export type OrderStatus = "awaiting_method" | "pending" | "paid" | "failed" | "expired";

export type OrderItem = { name: string; quantity: number };

export type Order = {
  orderId: string;
  eventName: string;
  items: OrderItem[];
  totalIdr: number;
  /** Batas pembayaran, jam server (ADR-0005). */
  expiresAt: string;
  serverNow: string;
  status: OrderStatus;
  method?: PaymentMethod;
  instruction?: PaymentInstruction;
};

export type PaymentOutcome = "success" | "fail";
