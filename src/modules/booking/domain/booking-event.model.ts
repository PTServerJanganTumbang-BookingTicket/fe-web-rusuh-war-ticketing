/** Event yang sedang dipesan, untuk kartu di kolom samping Detail Tiket. */
export type BookingEvent = {
  name: string;
  category: string;
  city: string;
  venue: string;
  /** Tanggal event (YYYY-MM-DD). */
  date: string;
  imageUrl: string;
};
