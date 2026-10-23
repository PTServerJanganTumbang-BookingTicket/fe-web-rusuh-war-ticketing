import { describe, expect, it } from "vitest";
import { eventsResponse } from "../../contracts/events";
import { toEvent } from "../events";

// Contract test: fixture berbentuk JSON BE di-parse contract lalu dipetakan ke domain. Saat kontrak BE final, ganti
// fixture dengan contoh dari OpenAPI; kegagalan di sini menunjuk mapper yang harus disesuaikan (ADR-0017).

describe("toEvent", () => {
  it("memetakan event", () => {
    const dto = eventsResponse.parse({
      events: [{ id: "evt-1", name: "Konser A", venue: "GBK", startsAt: "2026-12-25T12:00:00.000Z", status: "on_sale", minPriceIdr: 500_000 }],
    });
    expect(dto.events.map(toEvent)).toEqual([
      { id: "evt-1", name: "Konser A", venue: "GBK", startsAt: "2026-12-25T12:00:00.000Z", status: "on_sale", minPriceIdr: 500_000 },
    ]);
  });

  it("menolak status di luar kontrak", () => {
    expect(eventsResponse.safeParse({ events: [{ id: "evt-1", name: "A", venue: "B", startsAt: "x", status: "segera_habis", minPriceIdr: 1 }] }).success).toBe(false);
  });
});
