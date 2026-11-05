import { describe, expect, it } from "vitest";
import { AppFailure } from "@/core/domain/app-error";
import type { SavedNikInput } from "../../domain/account.model";
import type { SavedNikProtocol } from "../../domain/saved-nik.protocol";
import { createAddSavedNikUseCase } from "../add-saved-nik.use-case";
import { createUpdateSavedNikUseCase } from "../update-saved-nik.use-case";
import { createGetProfileUseCase } from "../get-profile.use-case";

function fakeSavedNikService() {
  const calls: { added: [string, string][]; updated: [string, SavedNikInput][] } = { added: [], updated: [] };
  const savedNikService: SavedNikProtocol = {
    list: async () => ({ maxEntries: 5, savedNiks: [] }),
    add: async (nik, label) => {
      calls.added.push([nik, label]);
    },
    update: async (id, input) => {
      calls.updated.push([id, input]);
    },
    remove: async () => undefined,
  };
  return { savedNikService, calls };
}

async function rejection(promise: Promise<unknown>) {
  const thrown = await promise.catch((error: unknown) => error);
  expect(thrown).toBeInstanceOf(AppFailure);
  return (thrown as AppFailure).error;
}

describe("createAddSavedNikUseCase", () => {
  it("merapikan nama lalu meneruskan NIK dan nama", async () => {
    const { savedNikService, calls } = fakeSavedNikService();
    await createAddSavedNikUseCase({ savedNikService })("3171000000000033", "  Budi ");
    expect(calls.added).toEqual([["3171000000000033", "Budi"]]);
  });

  it("NIK bukan 16 digit ditolak tanpa memanggil server", async () => {
    const { savedNikService, calls } = fakeSavedNikService();
    expect(await rejection(createAddSavedNikUseCase({ savedNikService })("123", "Budi"))).toMatchObject({
      code: "NIK_INVALID",
    });
    expect(calls.added).toEqual([]);
  });
});

describe("createUpdateSavedNikUseCase", () => {
  it("mengubah nama saja: NIK kosong diteruskan supaya service tidak mengirimnya", async () => {
    const { savedNikService, calls } = fakeSavedNikService();
    await createUpdateSavedNikUseCase({ savedNikService })("snk_1", { label: " Budi S ", nik: "" });
    expect(calls.updated).toEqual([["snk_1", { label: "Budi S", nik: "" }]]);
  });

  it("nama kosong ditolak tanpa memanggil server", async () => {
    const { savedNikService, calls } = fakeSavedNikService();
    await rejection(createUpdateSavedNikUseCase({ savedNikService })("snk_1", { label: " ", nik: "" }));
    expect(calls.updated).toEqual([]);
  });
});

describe("createGetProfileUseCase", () => {
  it("mengembalikan profil dari ProfileProtocol", async () => {
    const profile = { name: "JOHN DOE", email: "a@b.co", nikMasked: "3171****22", memberSince: null };
    expect(await createGetProfileUseCase({ profileService: { get: async () => profile } })()).toBe(profile);
  });
});
