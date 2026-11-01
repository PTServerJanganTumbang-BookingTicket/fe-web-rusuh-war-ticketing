export type EventStatus = "upcoming" | "on_sale" | "sold_out";

export type Event = {
  id: string;
  name: string;
  venue: string;
  startsAt: string;
  status: EventStatus;
  minPriceIdr: number;
};
