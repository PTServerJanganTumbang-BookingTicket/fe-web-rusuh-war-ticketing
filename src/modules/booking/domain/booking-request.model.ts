/** Hasil cek NIK ke Dukcapil lewat `POST /nik/validate` (BR-02, fail-closed). */
export type NikCheck =
  | { status: "valid"; name: string }
  | { status: "not_found" }
  | { status: "inactive" }
  /** Sudah dipakai untuk tiket lain di event yang sama. */
  | { status: "used" };

/**
 * Pemegang satu tiket; tepat satu bentuk per kursi (kontrak §4.3). NIK lengkap hanya ada bila diketik: NIK tersimpan
 * dan NIK akun hanya dikenal FE dalam bentuk tersamar, jadi kursinya merujuk id entri atau akun itu sendiri.
 */
export type TicketHolderInput =
  /** NIK 16 digit yang diketik; server memverifikasinya ke Dukcapil. */
  | { kind: "typed"; nik: string }
  /** Entri Daftar NIK (`GET /accounts/me/saved-niks`), sudah terverifikasi. */
  | { kind: "saved"; savedNikId: string }
  /** NIK terdaftar milik customer yang masuk; paling banyak satu kursi. */
  | { kind: "account" };

export type BookingTicketInput = { categoryId: string; holder: TicketHolderInput };

export type SubmitBookingInput = {
  eventId: string;
  contactEmail: string;
  tickets: BookingTicketInput[];
};

export type CreatedBooking = { bookingId: string };
