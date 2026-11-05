import { MAX_TICKETS_PER_BOOKING } from "./booking.constants";
import type { BookingTicketInput } from "./booking-request.model";
import type { HolderAlias } from "./holder-alias.model";
import { isNikFormat } from "./ticket-slots.rules";

/** Alasan isian tiket ditolak sebelum dikirim. BR-01: maks. 3 tiket; BR-02: 1 NIK per tiket, tidak boleh dobel. */
export type BookingTicketsProblem = "empty" | "too_many" | "nik_format" | "duplicate_nik";

/** Aturan pemegang tiket satu booking. `null` berarti siap dikirim; server tetap memvalidasi ulang. */
export function validateBookingTickets(tickets: readonly BookingTicketInput[]): BookingTicketsProblem | null {
  if (tickets.length === 0) return "empty";
  if (tickets.length > MAX_TICKETS_PER_BOOKING) return "too_many";
  if (tickets.some((ticket) => !isNikFormat(ticket.nik))) return "nik_format";
  if (new Set(tickets.map((ticket) => ticket.nik)).size !== tickets.length) return "duplicate_nik";
  return null;
}

export type AliasOption = { alias: HolderAlias; takenByOtherTicket: boolean };

/**
 * Alias untuk satu tiket. Alias yang NIK-nya sudah dipakai tiket lain tidak boleh dipilih lagi (BR-02), tetapi
 * tetap tampil supaya pembeli tahu alasannya.
 */
export function aliasOptionsFor(
  slotKey: string,
  aliases: readonly HolderAlias[],
  niks: Readonly<Record<string, string>>,
): AliasOption[] {
  const usedElsewhere = new Set(
    Object.entries(niks)
      .filter(([key, nik]) => key !== slotKey && nik !== "")
      .map(([, nik]) => nik),
  );
  return aliases.map((alias) => ({ alias, takenByOtherTicket: usedElsewhere.has(alias.nik) }));
}
