import type { TicketCategory } from "./booking-session.model";
import type { Selection } from "./selection.reducer";

/** Satu tiket yang dipilih; tiap tiket butuh satu NIK (BR-02). */
export type TicketSlot = {
  key: string;
  categoryId: string;
  categoryName: string;
  priceIdr: number;
  /** Nomor urut tiket, mulai 1. */
  number: number;
};

/** Tiket urut sesuai kategori di layar, diberi kunci stabil supaya NIK yang sudah diisi tidak berpindah slot. */
export function ticketSlots(selection: Selection, categories: readonly TicketCategory[]): TicketSlot[] {
  const slots: TicketSlot[] = [];
  for (const category of categories) {
    for (let index = 0; index < (selection[category.id] ?? 0); index += 1) {
      slots.push({
        key: `${category.id}-${index}`,
        categoryId: category.id,
        categoryName: category.name,
        priceIdr: category.priceIdr,
        number: slots.length + 1,
      });
    }
  }
  return slots;
}

/** Kunci slot yang NIK-nya sama dengan slot lain (BR-02: satu NIK satu tiket). NIK kosong diabaikan. */
export function duplicateNikSlots(niks: Readonly<Record<string, string>>): Set<string> {
  const seen = new Map<string, string>();
  const duplicates = new Set<string>();
  for (const [key, nik] of Object.entries(niks)) {
    if (!nik) continue;
    const first = seen.get(nik);
    if (first) {
      duplicates.add(first);
      duplicates.add(key);
    } else {
      seen.set(nik, key);
    }
  }
  return duplicates;
}

/** NIK selalu 16 digit angka. Keaslian dicek Dukcapil di server. */
export function isNikFormat(value: string): boolean {
  return /^\d{16}$/.test(value);
}

export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}
