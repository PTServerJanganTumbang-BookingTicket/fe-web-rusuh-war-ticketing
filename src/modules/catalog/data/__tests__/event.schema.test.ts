import { describe, expect, it } from "vitest";
import { eventDetailSchema, eventSchema } from "../event.schema";

const raw = (display: Record<string, unknown>, extra: Record<string, unknown> = {}) => ({
  id: "evt_a",
  name: "Konser A",
  category: "FESTIVAL",
  location: { venue: "GBK", city: "Jakarta" },
  date: "2026-12-25",
  sale_starts_at: "2026-11-10T02:00:00Z",
  image_url: "x.jpg",
  status: "AVAILABLE",
  queue_state: "OPEN",
  display,
  ...extra,
});

/** Bentuk yang dikirim backend sekarang: tanpa `status`, `display` hanya `enabled`. */
const live = (queueState: string, enabled: boolean) => {
  return { ...raw({ enabled }, { queue_state: queueState }), status: undefined };
};

describe("eventSchema dari queue_state saja", () => {
  it.each([
    ["SCHEDULED", false, "disabled", "home.event.notOpen", "home.event.badge.notOpen", "AVAILABLE"],
    ["OPEN", true, "queue", "home.event.cta.queue", undefined, "AVAILABLE"],
    ["QUEUE_FULL", false, "disabled", "home.event.queueFull", "home.event.badge.queueFull", "AVAILABLE"],
    [
      "FULL_BOOKED",
      false,
      "disabled",
      "home.event.soldOutMayReturn",
      "home.event.badge.fullBooked",
      "SOLD_OUT",
    ],
    ["CLOSED", false, "disabled", "home.event.soldOut", "home.event.status.SOLD_OUT", "SOLD_OUT"],
  ])("%s", (queueState, enabled, action, labelKey, badgeKey, status) => {
    const event = eventSchema.parse(live(queueState, enabled));
    expect(event.queueState).toBe(queueState);
    expect(event.status).toBe(status);
    expect(event.display).toEqual({ enabled, action, labelKey, badgeKey });
  });

  it("server mematikan tombol event yang OPEN: tidak tersedia, tanpa alasan dan tanpa tautan", () => {
    expect(eventSchema.parse(live("OPEN", false)).display).toEqual({
      enabled: false,
      action: "queue",
      labelKey: "home.event.unavailable",
      badgeKey: undefined,
    });
  });

  it("server mengaktifkan tombol untuk status yang tidak bisa dibeli: tetap nonaktif", () => {
    expect(eventSchema.parse(live("CLOSED", true)).display).toMatchObject({
      enabled: false,
      action: "disabled",
    });
  });

  it("nama lama kontrak v2.12 disamakan ke nama baru", () => {
    const state = (queueState: string) => eventSchema.parse(live(queueState, true)).queueState;
    expect(state("NOT_OPEN")).toBe("SCHEDULED");
    expect(state("DIRECT")).toBe("OPEN");
    expect(state("FULL")).toBe("QUEUE_FULL");
  });

  it("queue_state di luar daftar ditolak", () => {
    expect(eventSchema.safeParse(live("PAUSED", true)).success).toBe(false);
  });
});

describe("eventSchema display", () => {
  it.each([
    ["join_queue", "queue", "home.event.cta.queue", undefined],
    ["buy_now", "book", "home.event.cta.book", undefined],
  ])("%s: tombol aktif", (labelKey, _a, expectedLabel, badge) => {
    const event = eventSchema.parse(
      raw({
        enabled: true,
        action: labelKey === "buy_now" ? "GO_TO_TICKETS" : "JOIN_QUEUE",
        label_key: labelKey,
        badge_key: null,
      }),
    );
    expect(event.display.labelKey).toBe(expectedLabel);
    expect(event.display.badgeKey).toBe(badge);
  });

  it.each([
    ["sold_out", "home.event.soldOut", "home.event.status.SOLD_OUT"],
    ["sold_out_may_return", "home.event.soldOutMayReturn", "home.event.badge.fullBooked"],
    ["coming_soon", "home.event.notOpen", "home.event.badge.notOpen"],
    ["queue_full", "home.event.queueFull", "home.event.badge.queueFull"],
  ])("%s: tombol nonaktif dengan chip sesuai kondisi", (labelKey, label, badge) => {
    const event = eventSchema.parse(
      raw({ enabled: false, action: "NONE", label_key: labelKey, badge_key: null }),
    );
    expect(event.display).toMatchObject({
      enabled: false,
      action: "disabled",
      labelKey: label,
      badgeKey: badge,
    });
  });

  it("selling_out_fast dari server menjadi chip SELLING OUT", () => {
    const event = eventSchema.parse(
      raw({ enabled: true, action: "JOIN_QUEUE", label_key: "join_queue", badge_key: "selling_out_fast" }),
    );
    expect(event.display.badgeKey).toBe("home.event.status.SELLING_OUT_FAST");
  });

  it("tombol nonaktif: chip mengikuti alasan nonaktif walau server masih mengirim selling_out_fast", () => {
    const event = eventSchema.parse(
      raw({ enabled: false, action: "NONE", label_key: "queue_full", badge_key: "selling_out_fast" }),
    );
    expect(event.display.badgeKey).toBe("home.event.badge.queueFull");
  });

  it("membawa kategori dan jadwal buka; kategori kosong jatuh ke bawaan", () => {
    const display = { enabled: true, action: "JOIN_QUEUE", label_key: "join_queue", badge_key: null };
    expect(eventSchema.parse(raw(display))).toMatchObject({
      category: "FESTIVAL",
      saleStartsAt: "2026-11-10T02:00:00Z",
    });
    expect(eventSchema.parse(raw(display, { category: null })).category).toBe("EVENT");
  });
});

describe("eventDetailSchema", () => {
  const detailRaw = (extra: Record<string, unknown> = {}) =>
    raw({ enabled: true, action: "JOIN_QUEUE", label_key: "join_queue" }, extra);

  it("detail lengkap: jam, deskripsi, dan kategori tiket dipetakan", () => {
    const event = eventDetailSchema.parse(
      detailRaw({
        time: " 19:00 ",
        description: "Energi panggung.",
        ticket_categories: [
          {
            id: "vip",
            name: "VIP",
            description: "Dekat",
            price: 1_500_000,
            available: 5,
            status: "AVAILABLE",
          },
          { id: "reg", name: "Regular", price: 500_000, available: 0, status: "SOLD_OUT" },
        ],
      }),
    );
    expect(event.time).toBe("19:00");
    expect(event.description).toBe("Energi panggung.");
    expect(event.venue).toBe("GBK, Jakarta");
    expect(event.ticketCategories).toEqual([
      { id: "vip", name: "VIP", description: "Dekat", price: 1_500_000, available: 5, status: "AVAILABLE" },
      {
        id: "reg",
        name: "Regular",
        description: undefined,
        price: 500_000,
        available: 0,
        status: "SOLD_OUT",
      },
    ]);
  });

  it("minimal: tanpa time, description, dan ticket_categories tetap lolos", () => {
    const event = eventDetailSchema.parse(detailRaw());
    expect(event.time).toBeUndefined();
    expect(event.description).toBeUndefined();
    expect(event.ticketCategories).toEqual([]);
  });

  it("stok negatif tampil 0 dan status diturunkan dari stok bila server tidak mengirimnya", () => {
    const event = eventDetailSchema.parse(
      detailRaw({
        ticket_categories: [
          { id: "a", name: "A", price: 1, available: -3 },
          { id: "b", name: "B", price: 1, available: 4 },
        ],
      }),
    );
    expect(event.ticketCategories.map((c) => [c.available, c.status])).toEqual([
      [0, "SOLD_OUT"],
      [4, "AVAILABLE"],
    ]);
  });

  it("tidak valid: harga negatif, status kategori asing, queue_state asing, atau field wajib hilang", () => {
    const category = { id: "a", name: "A", price: 1, available: 1 };
    const parse = (extra: Record<string, unknown>) => eventDetailSchema.safeParse(detailRaw(extra)).success;
    expect(parse({ ticket_categories: [{ ...category, price: -1 }] })).toBe(false);
    expect(parse({ ticket_categories: [{ ...category, status: "HOLD" }] })).toBe(false);
    expect(parse({ queue_state: "PAUSED" })).toBe(false);
    expect(eventDetailSchema.safeParse({ id: "x" }).success).toBe(false);
  });
});
