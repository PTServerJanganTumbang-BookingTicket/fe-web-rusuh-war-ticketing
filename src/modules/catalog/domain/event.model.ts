/**
 * Event status — ketersediaan stok tiket (Req 1.7).
 * Nilai dikirim server dalam SCREAMING_SNAKE_CASE sesuai API v2.1.
 */
export type EventStatus = "AVAILABLE" | "SELLING_OUT_FAST" | "SOLD_OUT";

/**
 * Queue state — status event dari sisi antrian (Req 1.7), sama dengan state antrian di stream.
 * - SCHEDULED: penjualan belum dibuka
 * - OPEN: antrian menerima pendatang
 * - QUEUE_FULL: antrian penuh (Req 1.8)
 * - FULL_BOOKED: semua kursi sedang ditahan; reversibel
 * - CLOSED: penjualan selesai
 */
export type QueueState = "SCHEDULED" | "OPEN" | "QUEUE_FULL" | "FULL_BOOKED" | "CLOSED";

/**
 * Display block — respons siap-render dari server (Req 1.7).
 * Frontend tidak perlu memutuskan presedensi status; server sudah menghitung.
 */
export type DisplayBlock = {
  /** Apakah tombol beli aktif (clickable) */
  enabled: boolean;
  /** Aksi yang dilakukan saat diklik */
  action: "queue" | "book" | "disabled";
  /** Key i18n untuk label tombol */
  labelKey: string;
  /** Key i18n untuk badge status (opsional) */
  badgeKey?: string;
};

/**
 * Domain model event untuk catalog/home.
 * Ref: Req 1.1 (menampilkan daftar event), 1.2 (available clickable), 1.3 (sold out disabled).
 */
export type Event = {
  id: string;
  name: string;
  /** ISO date string — tanggal pelaksanaan event */
  date: string;
  venue: string;
  /** Kategori event dari server (mis. "LIVE MUSIC"); dasar filter kategori di Home. */
  category: string;
  /** ISO — kapan penjualan dibuka; dipakai label "Buka 10 Nov 09:00" saat belum dibuka. */
  saleStartsAt?: string;
  imageUrl: string;
  /** Ketersediaan stok (AVAILABLE, SELLING_OUT_FAST, SOLD_OUT); diturunkan dari `queueState` bila server tidak mengirimnya. */
  status: EventStatus;
  /** Status antrian event (SCHEDULED, OPEN, QUEUE_FULL, FULL_BOOKED, CLOSED) */
  queueState: QueueState;
  /** Tombol dan chip kartu: dari blok `display` server, dilengkapi dari `queueState` bila server hanya mengirim `enabled`. */
  display: DisplayBlock;
};

/**
 * Satu kategori tiket di halaman detail event (kontrak §2.2).
 * `status` dari server: `AVAILABLE` bila `available > 0`, selain itu `SOLD_OUT`.
 */
export type TicketCategory = {
  id: string;
  name: string;
  description?: string;
  /** Harga per tiket dalam rupiah. */
  price: number;
  /** Sisa stok; tidak pernah negatif. Perkiraan, karena respons di-cache CDN (kontrak §2.2). */
  available: number;
  status: "AVAILABLE" | "SOLD_OUT";
};

/**
 * Detail satu event untuk halaman `/events/{eventId}` (kontrak §2.2, FR-11, FR-12).
 * Tombol dan chip mengikuti blok `display` yang sama dengan kartu di Home.
 */
export type EventDetail = Event & {
  /** Jam mulai "HH:mm" waktu setempat venue, apa adanya dari server. */
  time?: string;
  description?: string;
  ticketCategories: TicketCategory[];
};
