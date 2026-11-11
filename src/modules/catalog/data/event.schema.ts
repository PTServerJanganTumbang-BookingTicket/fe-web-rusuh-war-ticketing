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

/**
 * `queue_state` dari server. Nama lama kontrak v2.12 (`NOT_OPEN`, `DIRECT`, `FULL`) tetap diterima dan disamakan
 * ke nama yang dipakai backend sekarang.
 */
const QUEUE_STATES = {
  SCHEDULED: "SCHEDULED",
  OPEN: "OPEN",
  QUEUE_FULL: "QUEUE_FULL",
  FULL_QUEUE: "QUEUE_FULL",
  FULL_BOOKED: "FULL_BOOKED",
  CLOSED: "CLOSED",
  NOT_OPEN: "SCHEDULED",
  DIRECT: "OPEN",
  FULL: "QUEUE_FULL",
} as const satisfies Record<string, QueueState>;

type RawAction = keyof typeof ACTIONS;

/** Tombol untuk tiap status bila server hanya mengirim `display.enabled` (tanpa `action` dan `label_key`). */
const STATE_DISPLAY: Record<QueueState, { action: RawAction; labelKey: string }> = {
  SCHEDULED: { action: "NONE", labelKey: "coming_soon" },
  OPEN: { action: "JOIN_QUEUE", labelKey: "join_queue" },
  QUEUE_FULL: { action: "NONE", labelKey: "queue_full" },
  FULL_BOOKED: { action: "NONE", labelKey: "sold_out_may_return" },
  CLOSED: { action: "NONE", labelKey: "sold_out" },
};

/** Stok bila server tidak mengirim `status`: hanya status tanpa kursi yang berarti habis. */
const STATE_STATUS: Record<QueueState, EventStatus> = {
  SCHEDULED: "AVAILABLE",
  OPEN: "AVAILABLE",
  QUEUE_FULL: "AVAILABLE",
  FULL_BOOKED: "SOLD_OUT",
  CLOSED: "SOLD_OUT",
};

const displaySchema = z.object({
  enabled: z.boolean(),
  action: z.enum(["JOIN_QUEUE", "GO_TO_TICKETS", "NONE"]).nullish(),
  label_key: z.string().nullish(),
  badge_key: z.string().nullish(),
});

function toDisplay(display: z.infer<typeof displaySchema>, queueState: QueueState): DisplayBlock {
  const fallback = STATE_DISPLAY[queueState];
  const action = display.action ?? fallback.action;
  // Server mematikan tombol untuk status yang biasanya bisa dibeli: tidak ada alasan yang bisa ditampilkan.
  const rawLabel = display.label_key ?? (display.enabled === (action !== "NONE") ? fallback.labelKey : "");
  return {
    enabled: display.enabled && action !== "NONE",
    action: ACTIONS[action],
    labelKey: LABEL_KEYS[rawLabel] ?? (display.enabled ? "home.event.cta" : "home.event.unavailable"),
    // Tombol nonaktif: chip mengikuti alasannya, bukan "selling out" (kontrak §2.1: badge hanya saat enabled).
    badgeKey: BADGE_KEYS[(display.enabled ? display.badge_key : null) ?? rawLabel],
  };
}

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
    status: z.enum(["AVAILABLE", "SELLING_OUT_FAST", "SOLD_OUT"]).nullish(),
    queue_state: z.enum(Object.keys(QUEUE_STATES) as [keyof typeof QUEUE_STATES]),
    display: displaySchema,
  })
  .transform((event): Event => {
    const queueState: QueueState = QUEUE_STATES[event.queue_state];
    return {
      id: event.id,
      name: event.name,
      date: event.date,
      venue: `${event.location.venue}, ${event.location.city}`,
      category: event.category?.trim() || DEFAULT_CATEGORY,
      saleStartsAt: event.sale_starts_at ?? undefined,
      imageUrl: event.image_url,
      status: event.status ?? STATE_STATUS[queueState],
      queueState,
      display: toDisplay(event.display, queueState),
    };
  });

/** `data` dari `GET /events`. Pagination ada di `meta` dan belum dipakai Home. */
export const eventListSchema = z.array(eventSchema);

/** `data` dari `GET /events/{event_id}`. */
export const eventDetailSchema = eventSchema;
