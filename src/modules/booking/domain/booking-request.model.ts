/** Hasil cek NIK ke Dukcapil lewat `POST /nik/validate` (BR-02, fail-closed). */
export type NikCheck =
  | { status: "valid"; name: string }
  | { status: "not_found" }
  | { status: "inactive" }
  /** Sudah dipakai untuk tiket lain di event yang sama. */
  | { status: "used" };

export type BookingTicketInput = { categoryId: string; nik: string };

export type SubmitBookingInput = {
  eventId: string;
  contactEmail: string;
  tickets: BookingTicketInput[];
  termsVersion: string;
};

export type CreatedBooking = { bookingId: string };
