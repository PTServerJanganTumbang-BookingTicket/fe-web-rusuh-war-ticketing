import { asClass, type NameAndRegistrationPair } from "awilix";
import type { EventRepository } from "./application/EventRepository";
import { ListEvents } from "./application/ListEvents";
import type { CatalogDependencies } from "./application/dependencies";
import { HttpEventRepository } from "./infrastructure/HttpEventRepository";

export type CatalogCradle = CatalogDependencies & {
  eventRepository: EventRepository;
};

export function catalogModule(): NameAndRegistrationPair<CatalogCradle> {
  return {
    eventRepository: asClass(HttpEventRepository).singleton(),
    listEvents: asClass(ListEvents).singleton(),
  };
}
