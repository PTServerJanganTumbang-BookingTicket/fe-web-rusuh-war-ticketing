import { describe, expect, it } from "vitest";
import { AppFailure } from "@/core/domain/app-error";
import type { SavedNikInput } from "../../domain/account.model";
import type { SavedNikProtocol } from "../../domain/saved-nik.protocol";
import { createAddSavedNikUseCase } from "../add-saved-nik.use-case";
import { createUpdateSavedNikUseCase } from "../update-saved-nik.use-case";
import { createGetProfileUseCase } from "../get-profile.use-case";

function fakeSavedNikService() {
  const calls: { added: SavedNikInput[]; updated: [string, SavedNikInput][] } = { added: [], updated: [] };
  const savedNikService: SavedNikProtocol = {
    list: async () => ({ maxEntries: 5, savedNiks: [] }),
    add: async (input) => {
      calls.added.push(input);
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
  it("merapikan nama alias dan nama lengkap lalu meneruskan semuanya", async () => {
    const { savedNikService, calls } = fakeSavedNikService();
    await createAddSavedNikUseCase({ savedNikService })({
      nik: "3171000000000033",
      label: "  Budi ",
      name: " Budi Santoso ",
    });
    expect(calls.added).toEqual([{ nik: "3171000000000033", label: "Budi", name: "Budi Santoso" }]);
  });

  it("NIK bukan 16 digit ditolak tanpa memanggil server", async () => {
    const { savedNikService, calls } = fakeSavedNikService();
    expect(
      await rejection(
        createAddSavedNikUseCase({ savedNikService })({ nik: "123", label: "Budi", name: "Budi" }),
      ),
    ).toMatchObject({
      code: "NIK_INVALID",
    });
    expect(calls.added).toEqual([]);
  });

  it("nama lengkap kosong ditolak tanpa memanggil server", async () => {
    const { savedNikService, calls } = fakeSavedNikService();
    await rejection(
      createAddSavedNikUseCase({ savedNikService })({ nik: "3171000000000033", label: "Budi", name: " " }),
    );
    expect(calls.added).toEqual([]);
  });
});

describe("createUpdateSavedNikUseCase", () => {
  it("mengubah nama saja: NIK kosong diteruskan supaya service tidak mengirimnya", async () => {
    const { savedNikService, calls } = fakeSavedNikService();
    await createUpdateSavedNikUseCase({ savedNikService })("snk_1", {
      label: " Budi S ",
      name: " Budi Santoso ",
      nik: "",
    });
    expect(calls.updated).toEqual([["snk_1", { label: "Budi S", name: "Budi Santoso", nik: "" }]]);
  });

  it("nama kosong ditolak tanpa memanggil server", async () => {
    const { savedNikService, calls } = fakeSavedNikService();
    await rejection(
      createUpdateSavedNikUseCase({ savedNikService })("snk_1", { label: " ", name: "Budi", nik: "" }),
    );
    expect(calls.updated).toEqual([]);
  });
});

describe("createGetProfileUseCase", () => {
  it("mengembalikan profil dari ProfileProtocol", async () => {
    const profile = { name: "JOHN DOE", email: "a@b.co", nikMasked: "3171****22", memberSince: null };
    expect(await createGetProfileUseCase({ profileService: { get: async () => profile } })()).toBe(profile);
  });
});
