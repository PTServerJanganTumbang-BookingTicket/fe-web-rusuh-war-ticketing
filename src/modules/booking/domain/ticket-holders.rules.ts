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

/** Id pseudo-alias untuk NIK pemilik akun (pemesan); tidak bentrok dengan id alias dari BE (`snk_*`). */
export const OWNER_HOLDER_ID = "owner";

/**
 * Pilihan pemegang tiket untuk customer yang masuk: NIK pemilik akun dulu, lalu alias. Pemilik diperlakukan
 * sebagai alias supaya mekanik pilih/isi NIK/cek Dukcapil/BR-02 dipakai ulang. Pemilik hanya masuk bila NIK
 * lengkapnya ada, karena `POST /bookings` butuh NIK utuh (docs/api/contract-assumptions.md). Alias dengan NIK
 * yang sama dengan pemilik dibuang agar tidak ada dua pilihan untuk orang yang sama.
 */
export function holderChoices(
  account: { nikMasked: string; nik?: string } | null,
  aliases: readonly HolderAlias[],
): HolderAlias[] {
  const ownerNik = account?.nik;
  if (!account || !ownerNik) return [...aliases];
  const owner: HolderAlias = { id: OWNER_HOLDER_ID, label: "", nik: ownerNik, nikMasked: account.nikMasked };
  return [owner, ...aliases.filter((alias) => alias.nik !== ownerNik)];
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
