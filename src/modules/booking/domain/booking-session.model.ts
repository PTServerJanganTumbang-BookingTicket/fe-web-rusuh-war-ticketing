export type TicketCategory = {
  id: string;
  name: string;
  description: string;
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
  /**
   * NIK terdaftar akun dalam bentuk tersamar (`account.nik_masked`, kontrak §4.1). `null` untuk tamu dan untuk akun
   * tanpa NIK terverifikasi.
   */
  maskedNik: string | null;
  quota: BookingQuota;
  categories: TicketCategory[];
};
