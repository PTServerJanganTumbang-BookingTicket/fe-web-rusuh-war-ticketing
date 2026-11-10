import { describe, expect, it } from "vitest";
import { AppFailure } from "@/core/domain/app-error";
import type { SavedNikInput } from "../../domain/account.model";
import type { SavedNikProtocol } from "../../domain/saved-nik.protocol";
import { createAddSavedNikUseCase } from "../add-saved-nik.use-case";

function fakeSavedNikService() {
  const calls: { added: SavedNikInput[] } = { added: [] };
  const savedNikService: SavedNikProtocol = {
    list: async () => ({ maxEntries: 5, savedNiks: [] }),
    add: async (input) => {
      calls.added.push(input);
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
  it("merapikan nama alias lalu meneruskan alias dan NIK", async () => {
    const { savedNikService, calls } = fakeSavedNikService();
    await createAddSavedNikUseCase({ savedNikService })({
      nik: "3171000000000033",
      label: "  Budi ",
    });
    expect(calls.added).toEqual([{ nik: "3171000000000033", label: "Budi" }]);
  });

  it("NIK bukan 16 digit ditolak tanpa memanggil server", async () => {
    const { savedNikService, calls } = fakeSavedNikService();
    expect(
      await rejection(createAddSavedNikUseCase({ savedNikService })({ nik: "123", label: "Budi" })),
    ).toMatchObject({
      code: "NIK_INVALID",
    });
    expect(calls.added).toEqual([]);
  });

  it("nama alias kosong diganti nama dari 4 digit terakhir NIK (kontrak mewajibkan label)", async () => {
    const { savedNikService, calls } = fakeSavedNikService();
    await createAddSavedNikUseCase({ savedNikService })({ nik: "3171000000000033", label: " " });
    expect(calls.added).toEqual([{ nik: "3171000000000033", label: "NIK ••0033" }]);
  });
});
