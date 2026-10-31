import { asClass, asFunction, type NameAndRegistrationPair } from "awilix";
import type { EventProtocol } from "./domain/event.protocol";
import { createListEventsUseCase } from "./application/list-events.use-case";
import type { CatalogDependencies } from "./application/catalog.dependencies";
import { HttpEventService } from "./data/http-event.service";

export type CatalogRegistry = CatalogDependencies & {
  eventService: EventProtocol;
};

export function catalogModule(): NameAndRegistrationPair<CatalogRegistry> {
  return {
    eventService: asClass(HttpEventService).singleton(),
    listEventsUseCase: asFunction(createListEventsUseCase).singleton(),
  };
}
