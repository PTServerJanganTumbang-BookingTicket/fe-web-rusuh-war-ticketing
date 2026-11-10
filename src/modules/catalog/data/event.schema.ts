import { z } from "zod";
import { DEFAULT_CATEGORY } from "../domain/catalog.constants";
import type { DisplayBlock, Event, EventStatus, QueueState } from "../domain/event.model";

/** Aksi kontrak → aksi tombol di FE. */
const ACTIONS: Record<"JOIN_QUEUE" | "GO_TO_TICKETS" | "NONE", DisplayBlock["action"]> = {
  JOIN_QUEUE: "queue",
  GO_TO_TICKETS: "book",
  NONE: "disabled",
};

/** `label_key` dan `badge_key` kontrak → key i18n. Key yang belum dikenal jatuh ke label umum. */
const LABEL_KEYS: Record<string, string> = {
  join_queue: "home.event.cta.queue",
  buy_now: "home.event.cta.book",
  go_to_tickets: "home.event.cta.book",
  sold_out: "home.event.soldOut",
  sold_out_may_return: "home.event.soldOutMayReturn",
  coming_soon: "home.event.notOpen",
  sale_not_open: "home.event.notOpen",
  queue_full: "home.event.queueFull",
};
/** Chip kartu. Kontrak hanya mengirim `selling_out_fast`; sisanya diturunkan dari `label_key` (kontrak §2.1). */
const BADGE_KEYS: Record<string, string> = {
  selling_out_fast: "home.event.status.SELLING_OUT_FAST",
  sold_out: "home.event.status.SOLD_OUT",
  sold_out_may_return: "home.event.badge.fullBooked",
  coming_soon: "home.event.badge.notOpen",
  sale_not_open: "home.event.badge.notOpen",
  queue_full: "home.event.badge.queueFull",
};

const displaySchema = z
  .object({
    enabled: z.boolean(),
    action: z.enum(["JOIN_QUEUE", "GO_TO_TICKETS", "NONE"]),
    label_key: z.string(),
    badge_key: z.string().nullable(),
  })
  .transform((display): DisplayBlock => ({
    enabled: display.enabled,
    action: ACTIONS[display.action],
    labelKey:
      LABEL_KEYS[display.label_key] ?? (display.enabled ? "home.event.cta" : "home.event.unavailable"),
    badgeKey: BADGE_KEYS[display.badge_key ?? display.label_key],
  }));

/** Satu event di `GET /events` dan `GET /events/{event_id}` (kontrak §Events). */
export const eventSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    category: z.string().nullish(),
    location: z.object({ venue: z.string(), city: z.string() }),
    date: z.string(),
    sale_starts_at: z.string().nullish(),
    image_url: z.string(),
    status: z.enum(["AVAILABLE", "SELLING_OUT_FAST", "SOLD_OUT"]) satisfies z.ZodType<EventStatus>,
    queue_state: z.enum(["NOT_OPEN", "DIRECT", "OPEN", "FULL"]) satisfies z.ZodType<QueueState>,
    display: displaySchema,
  })
  .transform((event): Event => ({
    id: event.id,
    name: event.name,
    date: event.date,
    venue: `${event.location.venue}, ${event.location.city}`,
    category: event.category?.trim() || DEFAULT_CATEGORY,
    saleStartsAt: event.sale_starts_at ?? undefined,
    imageUrl: event.image_url,
    status: event.status,
    queueState: event.queue_state,
    display: event.display,
  }));

/** `data` dari `GET /events`. Pagination ada di `meta` dan belum dipakai Home. */
export const eventListSchema = z.array(eventSchema);

/** `data` dari `GET /events/{event_id}`. */
export const eventDetailSchema = eventSchema;
