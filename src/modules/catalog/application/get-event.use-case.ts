import type { EventDetail } from "../domain/event.model";
import type { EventProtocol } from "../domain/event.protocol";

export type GetEventUseCase = (eventId: string) => Promise<EventDetail>;

/** Detail satu event untuk halaman `/events/{eventId}`. Requirement: FR-11, FR-12 (kontrak §2.2). */
export function createGetEventUseCase({ eventService }: { eventService: EventProtocol }): GetEventUseCase {
  return (eventId) => eventService.getEvent(eventId);
}
