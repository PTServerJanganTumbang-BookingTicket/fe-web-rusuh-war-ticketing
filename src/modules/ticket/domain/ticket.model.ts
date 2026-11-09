/**
 * Ticket domain models.
 * Ref: Requirement 7.1 (e-tiket berisi NIK_Attendee, kategori, QR code).
 * Ref: API Contract - GET /users/me/tickets, GET /tickets/{id}/eticket
 */

/**
 * Status tiket dalam lifecycle.
 */
export type TicketStatus = "ISSUED" | "USED" | "CANCELLED" | "EXPIRED";

/**
 * Summary tiket untuk list view (My Tickets page).
 * Tidak berisi data sensitif lengkap — hanya untuk display daftar.
 */
export type TicketSummary = {
  /** Unique ticket ID */
  id: string;
  /** Event yang terkait */
  event: {
    id: string;
    name: string;
    date: string;
    venue: string;
    imageUrl?: string;
  };
  /** Kategori tiket (VIP, Festival, dll) */
  category: string;
  /** Harga tiket (IDR); 0 bila tidak dikirim. */
  priceIdr: number;
  /** NIK pemegang tiket (masked); kosong karena list di kontrak tidak mengirimnya. */
  nikMasked: string;
  /** Nama pemegang tiket; kosong karena list di kontrak tidak mengirimnya. */
  holderName: string;
  /** Status tiket */
  status: TicketStatus;
  /** Tanggal issued */
  issuedAt: string;
};

/**
 * E-Ticket lengkap dengan QR code untuk entry.
 * Ref: Requirement 7.1 — QR code unik per tiket.
 */
export type ETicket = {
  /** Unique ticket ID */
  id: string;
  /** Event details */
  event: {
    id: string;
    name: string;
    date: string;
    /** Jam mulai (`HH:mm`, WIB) bila kontrak mengirimnya. */
    time?: string;
    venue: string;
    imageUrl?: string;
  };
  /** Kategori tiket */
  category: string;
  /** Harga tiket (IDR) */
  priceIdr: number;
  /** NIK pemegang (full, hanya untuk pemilik tiket) */
  nik: string;
  /** Nama pemegang tiket */
  holderName: string;
  /** Email pemegang tiket */
  holderEmail: string;
  /** Status tiket */
  status: TicketStatus;
  /** QR code sebagai base64 data URL (data:image/png;base64,...) */
  qrCode: string;
  /** QR code raw value untuk scanning (e.g., "TKT-001|evt_konser_a|NIK") */
  qrValue: string;
  /** Instruksi masuk venue */
  instructions: string;
  /** Tanggal issued */
  issuedAt: string;
  /** Booking ID terkait */
  bookingId: string;
};

/**
 * Response wrapper untuk list tiket.
 */
export type MyTicketsResult = {
  tickets: TicketSummary[];
  /** Total tiket yang dimiliki user */
  total: number;
};
