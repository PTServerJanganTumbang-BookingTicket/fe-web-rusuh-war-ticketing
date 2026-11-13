import { MAX_TICKETS_PER_BOOKING } from "./booking.constants";
import type { BookingTicketInput, TicketHolderInput } from "./booking-request.model";
import type { HolderAlias } from "./holder-alias.model";
import { duplicateNikSlots, isNikFormat } from "./ticket-slots.rules";

/** Alasan isian tiket ditolak sebelum dikirim. BR-01: maks. 3 tiket; BR-02: 1 NIK per tiket, tidak boleh dobel. */
export type BookingTicketsProblem = "empty" | "too_many" | "nik_format" | "duplicate_nik";

/** Id pilihan untuk NIK terdaftar pemilik akun (pemesan); tidak bentrok dengan id entri dari BE (`snk_*`). */
export const OWNER_HOLDER_ID = "owner";

/**
 * Identitas pemegang untuk membandingkan dua tiket (BR-02). NIK yang diketik dibandingkan nilainya; pilihan dari
 * profil dibandingkan id-nya karena NIK lengkapnya tidak pernah sampai ke FE. Awalan huruf menjamin id pilihan
 * tidak pernah sama dengan NIK (yang hanya digit). Server tetap membandingkan lewat hash NIK.
 */
export function holderIdentity(holder: TicketHolderInput): string {
  if (holder.kind === "account") return `holder:${OWNER_HOLDER_ID}`;
  if (holder.kind === "saved") return `holder:${holder.savedNikId}`;
  return holder.nik;
}

/** Pemegang satu tiket dari isian slot: pilihan dari profil menang atas NIK yang diketik. */
export function holderInputFor(pickedId: string | undefined, typedNik: string): TicketHolderInput {
  if (pickedId === OWNER_HOLDER_ID) return { kind: "account" };
  if (pickedId) return { kind: "saved", savedNikId: pickedId };
  return { kind: "typed", nik: typedNik };
}

/** Kunci slot yang pemegangnya sama dengan slot lain (BR-02). Slot dengan NIK kosong diabaikan. */
export function duplicateHolderSlots(holders: Readonly<Record<string, TicketHolderInput>>): Set<string> {
  return duplicateNikSlots(
    Object.fromEntries(Object.entries(holders).map(([key, holder]) => [key, holderIdentity(holder)])),
  );
}

/** Aturan pemegang tiket satu booking. `null` berarti siap dikirim; server tetap memvalidasi ulang. */
export function validateBookingTickets(tickets: readonly BookingTicketInput[]): BookingTicketsProblem | null {
  if (tickets.length === 0) return "empty";
  if (tickets.length > MAX_TICKETS_PER_BOOKING) return "too_many";
  if (tickets.some(({ holder }) => holder.kind === "typed" && !isNikFormat(holder.nik))) return "nik_format";
  if (new Set(tickets.map(({ holder }) => holderIdentity(holder))).size !== tickets.length)
    return "duplicate_nik";
  return null;
}

/**
 * Pilihan pemegang tiket untuk customer yang masuk: NIK terdaftar pemilik akun dulu, lalu entri Daftar NIK.
 * Pemilik hanya masuk bila akunnya punya NIK terverifikasi (`nik_masked` terisi). Dua pilihan yang ternyata NIK
 * yang sama tidak bisa dikenali dari bentuk tersamar; server menolaknya saat submit (kontrak §4.3).
 */
export function holderChoices(
  ownerNikMasked: string | null | undefined,
  aliases: readonly HolderAlias[],
): HolderAlias[] {
  if (!ownerNikMasked) return [...aliases];
  return [{ id: OWNER_HOLDER_ID, label: "", nikMasked: ownerNikMasked }, ...aliases];
}

export type AliasOption = { alias: HolderAlias; takenByOtherTicket: boolean };

/**
 * Pilihan untuk satu tiket. Pilihan yang sudah dipakai tiket lain tidak boleh dipilih lagi (BR-02), tetapi tetap
 * tampil supaya pembeli tahu alasannya. `picks`: kunci slot → id pilihan.
 */
export function aliasOptionsFor(
  slotKey: string,
  aliases: readonly HolderAlias[],
  picks: Readonly<Record<string, string>>,
): AliasOption[] {
  const usedElsewhere = new Set(
    Object.entries(picks)
      .filter(([key]) => key !== slotKey)
      .map(([, id]) => id),
  );
  return aliases.map((alias) => ({ alias, takenByOtherTicket: usedElsewhere.has(alias.id) }));
}
