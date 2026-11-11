// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { createWebStorageCredentialStoreService } from "../web-storage-credential-store.service";

describe("createWebStorageCredentialStoreService token antrian", () => {
  afterEach(() => window.sessionStorage.clear());

  it("disimpan per event dan terbaca lagi setelah halaman dimuat ulang (instance baru)", () => {
    const store = createWebStorageCredentialStoreService();
    expect(store.queueToken("evt_a")).toBeNull();
    store.saveQueueToken("evt_a", "qt_a");
    store.saveQueueToken("evt_b", "qt_b");

    const reloaded = createWebStorageCredentialStoreService();
    expect(reloaded.queueToken("evt_a")).toBe("qt_a");
    expect(reloaded.queueToken("evt_b")).toBe("qt_b");
  });

  it("dibuang per event, dari memori dan dari penyimpanan tab", () => {
    const store = createWebStorageCredentialStoreService();
    store.saveQueueToken("evt_a", "qt_a");
    store.saveQueueToken("evt_b", "qt_b");
    store.clearQueueToken("evt_a");
    expect(store.queueToken("evt_a")).toBeNull();
    expect(createWebStorageCredentialStoreService().queueToken("evt_a")).toBeNull();
    expect(store.queueToken("evt_b")).toBe("qt_b");
  });
});
