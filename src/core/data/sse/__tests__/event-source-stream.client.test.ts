import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { setupFakeEventSources } from "@/test/fake-event-source";
import { createEventSourceStreamClient } from "../event-source-stream.client";

const appConfig = {
  apiBaseUrl: "https://api.test",
  appBaseUrl: "",
  mocking: false,
  bookingExpiry: "queue",
} as const;

function setup() {
  const fakes = setupFakeEventSources();
  const client = createEventSourceStreamClient({ appConfig, eventSourceFactory: fakes.factory });
  const observer = { next: vi.fn(), connected: vi.fn(), disconnected: vi.fn() };
  const unsubscribe = client.open("/things/1/stream", "thing", z.object({ n: z.number() }), observer);
  const source = fakes.sources[0]!;
  return { observer, unsubscribe, source };
}

describe("createEventSourceStreamClient", () => {
  it("membuka URL API dengan cookie, tanpa token di URL", () => {
    const { source } = setup();
    expect(source.url).toBe("https://api.test/things/1/stream");
    expect(source.init).toEqual({ withCredentials: true });
  });

  it("melaporkan status koneksi", () => {
    const { observer, source } = setup();
    source.emit("open");
    expect(observer.connected).toHaveBeenCalledTimes(1);
    source.emit("error");
    expect(observer.disconnected).toHaveBeenCalledTimes(1);
  });

  it("meneruskan payload valid dan mengabaikan yang rusak", () => {
    const { observer, source } = setup();
    source.emit("thing", { n: 1 });
    source.emit("thing", "bukan-json");
    source.emit("thing", { n: "salah" });
    source.emit("lain", { n: 2 });
    expect(observer.next).toHaveBeenCalledTimes(1);
    expect(observer.next).toHaveBeenCalledWith({ n: 1 });
  });

  it("unsubscribe menutup EventSource", () => {
    const { unsubscribe, source } = setup();
    unsubscribe();
    expect(source.closed).toBe(true);
  });
});
