import type { GetEventUseCase } from "./get-event.use-case";
import type { ListEventsUseCase } from "./list-events.use-case";

/** Irisan container yang dipakai controller modul catalog. */
export type CatalogDependencies = {
  listEventsUseCase: ListEventsUseCase;
  getEventUseCase: GetEventUseCase;
};
