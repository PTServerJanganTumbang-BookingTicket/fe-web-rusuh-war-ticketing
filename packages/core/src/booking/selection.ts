import type { TicketCategory } from "../domain/booking";
import { canAddTicket } from "./canAddTicket";

/** Jumlah tiket terpilih per kategori. Kategori tanpa entri berarti 0. */
export type Selection = Readonly<Record<string, number>>;

export type SelectionAction =
  | { type: "ADD_TICKET"; categoryId: string; stock: Readonly<Record<string, number>>; activeBooked: number }
  | { type: "REMOVE_TICKET"; categoryId: string };

export function selectionReducer(selection: Selection, action: SelectionAction): Selection {
  switch (action.type) {
    case "ADD_TICKET": {
      if (!canAddTicket({ categoryId: action.categoryId, selection, stock: action.stock, activeBooked: action.activeBooked })) {
        return selection;
      }
      return { ...selection, [action.categoryId]: (selection[action.categoryId] ?? 0) + 1 };
    }
    case "REMOVE_TICKET": {
      const current = selection[action.categoryId] ?? 0;
      return current > 0 ? { ...selection, [action.categoryId]: current - 1 } : selection;
    }
  }
}

export function selectedCount(selection: Selection): number {
  return Object.values(selection).reduce((sum, qty) => sum + qty, 0);
}

/** Tombol lanjut aktif bila ada tiket terpilih dan sesi booking belum habis (jam server, ADR-0005). */
export function canSubmitBooking(selection: Selection, remainingMs: number): boolean {
  return selectedCount(selection) > 0 && remainingMs > 0;
}

export function totalPriceIdr(selection: Selection, categories: readonly TicketCategory[]): number {
  return categories.reduce((sum, category) => sum + category.priceIdr * (selection[category.id] ?? 0), 0);
}
