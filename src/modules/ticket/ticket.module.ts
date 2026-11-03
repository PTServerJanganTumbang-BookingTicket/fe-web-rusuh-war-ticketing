import { asFunction, type NameAndRegistrationPair } from "awilix";
import type { TicketProtocol } from "./domain/ticket.protocol";
import { createGetMyTicketsUseCase } from "./application/get-my-tickets.use-case";
import { createGetTicketUseCase } from "./application/get-ticket.use-case";
import type { TicketDependencies } from "./application/ticket.dependencies";
import { createHttpTicketService } from "./data/http-ticket.service";

export type TicketRegistry = TicketDependencies & {
  ticketService: TicketProtocol;
};

/**
 * Ticket module registration for Awilix DI container.
 * Ref: ADR-0013 (Awilix DI), ADR-0015 (module structure).
 */
export function ticketModule(): NameAndRegistrationPair<TicketRegistry> {
  return {
    ticketService: asFunction(createHttpTicketService).singleton(),
    getMyTicketsUseCase: asFunction(createGetMyTicketsUseCase).singleton(),
    getTicketUseCase: asFunction(createGetTicketUseCase).singleton(),
  };
}
