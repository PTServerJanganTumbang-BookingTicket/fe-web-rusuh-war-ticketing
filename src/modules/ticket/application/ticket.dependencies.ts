import type { GetMyTicketsUseCase } from "./get-my-tickets.use-case";
import type { GetTicketUseCase } from "./get-ticket.use-case";

/**
 * Dependencies yang di-inject ke ticket module via Awilix.
 */
export type TicketDependencies = {
  getMyTicketsUseCase: GetMyTicketsUseCase;
  getTicketUseCase: GetTicketUseCase;
};
