/**
 * Event status — ketersediaan stok tiket (Req 1.7).
 * Nilai dikirim server dalam SCREAMING_SNAKE_CASE sesuai API v2.1.
 */
export type EventStatus = "AVAILABLE" | "SELLING_OUT_FAST" | "SOLD_OUT";

/**
 * Queue state — izin masuk antrian (Req 1.7).
 * - NOT_OPEN: penjualan belum dibuka
 * - DIRECT: masuk langsung tanpa antrian
 * - OPEN: antrian aktif
 * - FULL: antrian penuh (Req 1.8)
 */
export type QueueState = "NOT_OPEN" | "DIRECT" | "OPEN" | "FULL";

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
  /** Ketersediaan stok (AVAILABLE, SELLING_OUT_FAST, SOLD_OUT) */
  status: EventStatus;
  /** Izin masuk antrian (NOT_OPEN, DIRECT, OPEN, FULL) */
  queueState: QueueState;
  /** Blok display siap-render dari server */
  display: DisplayBlock;
};
