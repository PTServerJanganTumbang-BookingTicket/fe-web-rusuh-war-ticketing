import { describe, expect, it } from "vitest";
import type { Event } from "@rusuh/core";
import { toEventCardProps } from "../toEventCardProps";

const event: Event = {
  id: "evt-1",
  name: "Konser A — Jakarta",
  venue: "GBK",
  startsAt: "2026-12-25T12:00:00.000Z",
  status: "on_sale",
  minPriceIdr: 500_000,
};

describe("toEventCardProps", () => {
  it("event on_sale: tanggal dan venue, badge AVAILABLE, tombol menuju waiting room", () => {
    const props = toEventCardProps(event);
    expect(props.meta).toBe("25 Des 2026 · GBK");
    expect(props.statusLabel).toBe("AVAILABLE");
    expect(props.cta).toEqual({ label: "Beli Tiket →", href: "/events/evt-1/queue" });
  });

  it("event sold_out: tombol nonaktif tanpa href", () => {
    const props = toEventCardProps({ ...event, status: "sold_out" });
    expect(props.statusLabel).toBe("SOLD OUT");
    expect(props.cta).toEqual({ label: "Tidak Tersedia" });
    expect(props.statusTone).toBe("danger");
  });

  it("event upcoming juga nonaktif", () => {
    expect(toEventCardProps({ ...event, status: "upcoming" }).cta.href).toBeUndefined();
  });
});
