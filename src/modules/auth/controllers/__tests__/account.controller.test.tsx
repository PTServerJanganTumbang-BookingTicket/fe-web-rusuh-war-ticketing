// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { createWrapper, setupMockServer, setupTestContainer } from "@/test/support";
import { useAccountController } from "../account.controller";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, replace: vi.fn() }) }));

setupMockServer();

async function mountSignedIn() {
  const container = setupTestContainer();
  await container.cradle.verifyLoginUseCase("mt_account");
  const hook = renderHook(() => useAccountController(), { wrapper: createWrapper(container) });
  await waitFor(() => expect(hook.result.current.kind).toBe("ready"));
  const ready = () => {
    const view = hook.result.current;
    if (view.kind !== "ready") throw new Error("belum siap");
    return view;
  };
  return { ...hook, ready };
}

describe("useAccountController", () => {
  it("tamu melihat ajakan masuk, bukan redirect paksa", async () => {
    const { result } = renderHook(() => useAccountController(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.kind).toBe("signedOut"));
    expect(result.current.kind === "signedOut" && result.current.login.href).toBe("/login");
  });

  it("menampilkan profil dan NIK teman dari server", async () => {
    const { ready } = await mountSignedIn();
    expect(ready().profile).toMatchObject({ email: "you@example.com", nikMasked: "3171********xx22" });
    expect(ready().saved.items.map((item) => item.label)).toEqual(["Budi"]);
    expect(ready().saved.hint).toBe("1/5 tersimpan. NIK teman bisa dipilih saat membeli tiket.");
  });

  it("menambah NIK teman lalu daftar dimuat ulang dan form dikosongkan", async () => {
    const { ready } = await mountSignedIn();
    act(() => {
      ready().add?.label.onChange("Sari");
      ready().add?.nik.onChange("3171000000000044");
    });
    act(() => ready().add?.submit.onSubmit());
    await waitFor(() => expect(ready().saved.items.map((item) => item.label)).toEqual(["Budi", "Sari"]));
    expect(ready().add?.nik.value).toBe("");
  });

  it("NIK tidak aktif di Dukcapil ditolak dengan pesan", async () => {
    const { ready } = await mountSignedIn();
    act(() => {
      ready().add?.label.onChange("X");
      ready().add?.nik.onChange("3171000000000099");
    });
    act(() => ready().add?.submit.onSubmit());
    await waitFor(() =>
      expect(ready().saved.error).toBe("NIK tidak ditemukan atau tidak aktif di Dukcapil."),
    );
  });

  it("menghapus NIK teman", async () => {
    const { ready } = await mountSignedIn();
    act(() => ready().saved.items[0]?.onRemove());
    await waitFor(() => expect(ready().saved.items).toEqual([]));
  });

  it("keluar menghapus sesi lalu kembali ke Home", async () => {
    push.mockClear();
    const { ready, result } = await mountSignedIn();
    act(() => ready().signOut.onClick());
    await waitFor(() => expect(push).toHaveBeenCalledWith("/"));
    expect(result.current.kind).toBe("signedOut");
  });
});
