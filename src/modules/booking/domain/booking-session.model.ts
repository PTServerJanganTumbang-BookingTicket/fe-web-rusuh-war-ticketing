export type TicketCategory = {
  id: string;
  name: string;
  priceIdr: number;
  /** Sisa stok. 0 berarti habis. */
  stock: number;
};

export type BookingQuota = { max: number; used: number; remaining: number };

export type BookingSession = {
  eventName: string;
  /** Batas sesi booking, jam server (ADR-0005). */
  expiresAt: string;
  /** Jam server saat response dibuat, untuk menghitung offset. */
  serverNow: string;
  /** NIK akun dalam bentuk tersamar (ADR-0011). `null` bila server tidak mengirimnya (kontrak v2.1, login opsional). */
  maskedNik: string | null;
  quota: BookingQuota;
  categories: TicketCategory[];
};
