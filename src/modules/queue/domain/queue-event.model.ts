/** Event yang sedang diantre, untuk kartu di samping posisi antrian (Waiting Room). */
export type QueueEvent = {
  name: string;
  category: string;
  city: string;
  venue: string;
  /** Tanggal event (YYYY-MM-DD). */
  date: string;
  imageUrl: string;
};
