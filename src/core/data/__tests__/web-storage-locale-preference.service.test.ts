// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { createWebStorageLocalePreferenceService } from "../web-storage-locale-preference.service";

afterEach(() => {
  vi.restoreAllMocks();
  window.localStorage.clear();
});

describe("createWebStorageLocalePreferenceService", () => {
  it("menyimpan dan membaca bahasa dari localStorage", () => {
    const preference = createWebStorageLocalePreferenceService();
    expect(preference.read()).toBeNull();
    preference.save("en");
    expect(window.localStorage.getItem("rusuh.locale")).toBe("en");
    expect(createWebStorageLocalePreferenceService().read()).toBe("en");
  });

  it("storage yang melempar tidak menggagalkan halaman; pilihan tetap di memori", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceeded");
    });
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    const preference = createWebStorageLocalePreferenceService();
    expect(() => preference.save("en")).not.toThrow();
    expect(preference.read()).toBe("en");
  });
});
