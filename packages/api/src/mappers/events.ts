import type { Event } from "@rusuh/core";
import type { EventDto } from "../contracts/events";

export function toEvent(dto: EventDto): Event {
  return {
    id: dto.id,
    name: dto.name,
    venue: dto.venue,
    startsAt: dto.startsAt,
    status: dto.status,
    minPriceIdr: dto.minPriceIdr,
  };
}
