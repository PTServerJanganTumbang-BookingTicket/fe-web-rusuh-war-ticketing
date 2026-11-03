import type { EventSummary } from "../domain/account.model";
import type { AuthProtocol } from "../domain/auth.protocol";

export type GetEventSummaryUseCase = (eventId: string) => Promise<EventSummary>;

/** Event dari booking yang dipulihkan setelah login (BR-09). */
export function createGetEventSummaryUseCase({
  authService,
}: {
  authService: AuthProtocol;
}): GetEventSummaryUseCase {
  return (eventId) => authService.getEventSummary(eventId);
}
