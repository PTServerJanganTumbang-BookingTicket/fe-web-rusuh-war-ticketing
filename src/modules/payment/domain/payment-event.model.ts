/** Event dari pesanan, untuk kartu di kolom samping halaman pembayaran. */
export type PaymentEvent = {
  name: string;
  category: string;
  city: string;
  venue: string;
  /** Tanggal event (YYYY-MM-DD). */
  date: string;
  imageUrl: string;
};
