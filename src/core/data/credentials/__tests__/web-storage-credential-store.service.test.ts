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

  it("clearQueueTokens membuang token semua event, dari memori dan penyimpanan tab, tanpa menyentuh key lain", () => {
    window.sessionStorage.setItem("lain", "tetap");
    const store = createWebStorageCredentialStoreService();
    store.saveQueueToken("evt_a", "qt_a");
    store.saveQueueToken("evt_b", "qt_b");
    store.saveGrantToken("evt_a", "gt_a");
    store.clearQueueTokens();
    expect(store.queueToken("evt_a")).toBeNull();
    expect(store.queueToken("evt_b")).toBeNull();
    const reloaded = createWebStorageCredentialStoreService();
    expect(reloaded.queueToken("evt_a")).toBeNull();
    expect(reloaded.queueToken("evt_b")).toBeNull();
    expect(window.sessionStorage.getItem("lain")).toBe("tetap");
    // Grant bukan urusan clearQueueTokens.
    expect(store.grantToken("evt_a")).toBe("gt_a");
  });
});

describe("createWebStorageCredentialStoreService grant", () => {
  afterEach(() => window.sessionStorage.clear());

  it("grant event A tidak diberikan untuk event B; tanpa event mengembalikan grant yang dipegang", () => {
    const store = createWebStorageCredentialStoreService();
    expect(store.grantToken()).toBeNull();
    store.saveGrantToken("evt_a", "gt_a");
    expect(store.grantToken("evt_a")).toBe("gt_a");
    expect(store.grantToken("evt_b")).toBeNull();
    expect(store.grantToken()).toBe("gt_a");
  });

  it("event pemilik grant ikut tersimpan dan terbaca setelah muat ulang (instance baru)", () => {
    createWebStorageCredentialStoreService().saveGrantToken("evt_a", "gt_a");
    const reloaded = createWebStorageCredentialStoreService();
    expect(reloaded.grantToken("evt_a")).toBe("gt_a");
    expect(reloaded.grantToken("evt_b")).toBeNull();
  });

  it("grant baru menggantikan grant event sebelumnya", () => {
    const store = createWebStorageCredentialStoreService();
    store.saveGrantToken("evt_a", "gt_a");
    store.saveGrantToken("evt_b", "gt_b");
    expect(store.grantToken("evt_a")).toBeNull();
    expect(store.grantToken("evt_b")).toBe("gt_b");
  });

  it("grant lama tanpa catatan event tidak dipakai untuk event mana pun", () => {
    window.sessionStorage.setItem("rusuh.grant_token", "gt_lama");
    const store = createWebStorageCredentialStoreService();
    expect(store.grantToken("evt_a")).toBeNull();
    expect(store.grantToken()).toBe("gt_lama");
  });

  it("clearGrantToken membuang grant dan event pemiliknya", () => {
    const store = createWebStorageCredentialStoreService();
    store.saveGrantToken("evt_a", "gt_a");
    store.clearGrantToken();
    expect(store.grantToken()).toBeNull();
    expect(store.grantToken("evt_a")).toBeNull();
    expect(createWebStorageCredentialStoreService().grantToken("evt_a")).toBeNull();
  });
});
