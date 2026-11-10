import type { TicketCategory } from "./booking-session.model";
import { canAddTicket } from "./can-add-ticket.rules";

/** Jumlah tiket terpilih per kategori. Kategori tanpa entri berarti 0. */
export type Selection = Readonly<Record<string, number>>;

export type SelectionAction =
  | { type: "ADD_TICKET"; categoryId: string; stock: Readonly<Record<string, number>>; activeBooked: number }
  | { type: "REMOVE_TICKET"; categoryId: string }
  /** Stok berubah di server: jumlah terpilih tidak boleh melebihi stok terbaru. */
  | { type: "CLAMP_TO_STOCK"; stock: Readonly<Record<string, number>> };

export function selectionReducer(selection: Selection, action: SelectionAction): Selection {
  switch (action.type) {
    case "ADD_TICKET": {
      if (
        !canAddTicket({
          categoryId: action.categoryId,
          selection,
          stock: action.stock,
          activeBooked: action.activeBooked,
        })
      ) {
        return selection;
      }
      return { ...selection, [action.categoryId]: (selection[action.categoryId] ?? 0) + 1 };
    }
    case "REMOVE_TICKET": {
      const current = selection[action.categoryId] ?? 0;
      return current > 0 ? { ...selection, [action.categoryId]: current - 1 } : selection;
    }
    case "CLAMP_TO_STOCK": {
      const next: Record<string, number> = {};
      for (const [categoryId, quantity] of Object.entries(selection)) {
        const capped = Math.min(quantity, Math.max(action.stock[categoryId] ?? 0, 0));
        if (capped > 0) next[categoryId] = capped;
      }
      return next;
    }
  }
}

export function selectedCount(selection: Selection): number {
  return Object.values(selection).reduce((sum, qty) => sum + qty, 0);
}

export function totalPriceIdr(selection: Selection, categories: readonly TicketCategory[]): number {
  return categories.reduce((sum, category) => sum + category.priceIdr * (selection[category.id] ?? 0), 0);
}
