import { describe, expect, it } from "vitest";
import { asValue } from "awilix";
import { readAppConfig } from "../app-config.reader";
import { createAppContainer, type AppRegistry } from "../container";

const config = {
  apiBaseUrl: "https://api.test",
  appBaseUrl: "",
  apiCredentials: "include",
  mocking: false,
  bookingExpiry: "queue",
  secureCookies: false,
} as const;

describe("composition root", () => {
  it("setiap registrasi bisa di-resolve dalam mode strict", () => {
    const container = createAppContainer(config);
    const names = Object.keys(container.registrations) as (keyof AppRegistry)[];
    expect(names.length).toBeGreaterThan(10);
    for (const name of names) expect(container.resolve(name), name).toBeDefined();
  });

  it("use case adalah singleton per container, bukan per proses", () => {
    const a = createAppContainer(config);
    const b = createAppContainer(config);
    expect(a.cradle.listEventsUseCase).toBe(a.cradle.listEventsUseCase);
    expect(a.cradle.listEventsUseCase).not.toBe(b.cradle.listEventsUseCase);
  });

  it("service bisa diganti tanpa menyentuh use case (DIP)", async () => {
    const container = createAppContainer(config);
    container.register({ eventService: asValue({ getEvents: async () => [] }) });
    expect(await container.cradle.listEventsUseCase()).toEqual([]);
  });

  it("registrasi yang tidak ada langsung gagal", () => {
    const container = createAppContainer(config);
    expect(() => container.resolve("tidakAda" as keyof AppRegistry)).toThrow();
  });
});

describe("readAppConfig", () => {
  it("membaca env dengan default aman", () => {
    expect(readAppConfig()).toMatchObject({ appBaseUrl: "", bookingExpiry: "queue" });
  });
});
