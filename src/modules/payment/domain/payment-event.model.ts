/**
 * @file payment-event.model.ts
 * @description Payment Event Model
 *
 * Representasi event untuk kartu ringkasan di halaman pembayaran.
 * Data diambil dari GET /events/{event_id}.
 */

/**
 * Event dari pesanan, untuk kartu di kolom samping halaman pembayaran.
 * Menampilkan informasi event yang dibeli customer.
 */
export type PaymentEvent = {
  /** Nama event */
  readonly name: string;
  /** Kategori event (e.g., "Konser", "Festival") */
  readonly category: string;
  /** Kota lokasi event */
  readonly city: string;
  /** Nama venue */
  readonly venue: string;
  /** Tanggal event dalam format YYYY-MM-DD */
  readonly date: string;
  /** URL gambar cover event */
  readonly imageUrl: string;
};
