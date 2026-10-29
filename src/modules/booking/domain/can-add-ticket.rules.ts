import { MAX_TICKETS_PER_NIK } from "./booking.constants";

export type CanAddTicketInput = {
  categoryId: string;
  /** Jumlah tiket yang sedang dipilih per kategori. */
  selection: Readonly<Record<string, number>>;
  /** Sisa stok per kategori. */
  stock: Readonly<Record<string, number>>;
  /** Tiket pada booking aktif milik NIK yang sama. */
  activeBooked: number;
};

export function canAddTicket(input: CanAddTicketInput): boolean {
  const selected = Object.values(input.selection).reduce((sum, qty) => sum + qty, 0);
  if (selected + input.activeBooked >= MAX_TICKETS_PER_NIK) return false;
  return (input.selection[input.categoryId] ?? 0) < (input.stock[input.categoryId] ?? 0);
}
