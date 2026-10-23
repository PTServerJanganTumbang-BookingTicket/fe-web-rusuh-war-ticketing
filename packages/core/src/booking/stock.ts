import type { TicketCategory } from "../domain/booking";

/** Sisa stok per id kategori, bentuk yang dibutuhkan `canAddTicket`. */
export function stockByCategory(categories: readonly TicketCategory[]): Record<string, number> {
  return Object.fromEntries(categories.map((category) => [category.id, category.stock]));
}
