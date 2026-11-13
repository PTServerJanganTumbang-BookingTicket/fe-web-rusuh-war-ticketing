import { asFunction, type NameAndRegistrationPair } from "awilix";
import type { EventProtocol } from "./domain/event.protocol";
import { createGetEventUseCase } from "./application/get-event.use-case";
import { createListEventsUseCase } from "./application/list-events.use-case";
import type { CatalogDependencies } from "./application/catalog.dependencies";
import { createHttpEventService } from "./data/http-event.service";

export type CatalogRegistry = CatalogDependencies & {
  eventService: EventProtocol;
};

export function catalogModule(): NameAndRegistrationPair<CatalogRegistry> {
  return {
    eventService: asFunction(createHttpEventService).singleton(),
    listEventsUseCase: asFunction(createListEventsUseCase).singleton(),
    getEventUseCase: asFunction(createGetEventUseCase).singleton(),
  };
}
