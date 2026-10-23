import { canAddTicket } from "../booking/canAddTicket";
import { selectionReducer, type Selection } from "../booking/selection";
import { stockByCategory } from "../booking/stock";
import type { BookingSession } from "../domain/booking";

// Use case Detail Ticket (FR-13–19, BR-01–04). Session dari server adalah satu-satunya sumber stok dan
// jumlah tiket aktif (`quota.used`), jadi perakitan input aturan dilakukan di sini, bukan di ViewModel (ADR-0011).

export function canAddTicketToSession(session: BookingSession, selection: Selection, categoryId: string): boolean {
  return canAddTicket({ categoryId, selection, stock: stockByCategory(session.categories), activeBooked: session.quota.used });
}

export function addTicket(session: BookingSession, selection: Selection, categoryId: string): Selection {
  return selectionReducer(selection, {
    type: "ADD_TICKET",
    categoryId,
    stock: stockByCategory(session.categories),
    activeBooked: session.quota.used,
  });
}

export function removeTicket(selection: Selection, categoryId: string): Selection {
  return selectionReducer(selection, { type: "REMOVE_TICKET", categoryId });
}
