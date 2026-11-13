import { describe, expect, it } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { clearAfterSignOut, refreshAfterSignIn } from "../session.cache";
import { sessionKeys } from "../session.queries";

const account = { email: "rina@example.com", nikMasked: "3171********0044" };

function deferred<T>() {
  let resolve: (value: T) => void = () => undefined;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

/** Memberi giliran pada microtask dan notifikasi TanStack Query yang tertunda. */
const flush = () => new Promise((done) => setTimeout(done, 0));

describe("session.cache", () => {
  it("keluar: navbar jadi tamu dan data milik akun (tiket, NIK tersimpan) dibuang", async () => {
    const client = new QueryClient();
    client.setQueryData(sessionKeys.account, account);
    client.setQueryData(["ticket", "my-tickets"], { tickets: [{ id: "TKT-1" }] });
    client.setQueryData(["auth", "saved-niks"], { savedNiks: [] });

    await clearAfterSignOut(client);

    expect(client.getQueryData(sessionKeys.account)).toBeNull();
    expect(client.getQueryData(["ticket", "my-tickets"])).toBeUndefined();
    expect(client.getQueryData(["auth", "saved-niks"])).toBeUndefined();
  });

  it("masuk: semua data ditandai usang, sesi dan tiket dimuat ulang", async () => {
    const client = new QueryClient();
    let calls = 0;
    const tickets = client.fetchQuery({ queryKey: ["ticket", "my-tickets"], queryFn: () => ++calls });
    await tickets;
    client.setQueryData(sessionKeys.account, null);

    const stale = () => client.getQueryState(["ticket", "my-tickets"])?.isInvalidated;
    expect(stale()).toBe(false);
    await refreshAfterSignIn(client);

    expect(stale()).toBe(true);
    expect(client.getQueryState(sessionKeys.account)?.isInvalidated).toBe(true);
  });

  // Respons sesi yang berangkat dari server sebelum logout tidak boleh menulis akun lama setelah cache dikosongkan.
  it("keluar: respons sesi yang masih di jalan dibatalkan, akun lama tidak kembali ke navbar", async () => {
    const client = new QueryClient();
    client.setQueryData(sessionKeys.account, account);
    const pending = deferred<typeof account | null>();
    const refetch = client.fetchQuery({ queryKey: sessionKeys.account, queryFn: () => pending.promise });

    await clearAfterSignOut(client);
    pending.resolve(account);
    await refetch.catch(() => undefined);
    await flush();

    expect(client.getQueryData(sessionKeys.account)).toBeNull();
    expect(client.getQueryState(sessionKeys.account)?.fetchStatus).toBe("idle");
  });

  it("keluar: permintaan data akun (tiket) yang masih di jalan tidak mengisi cache lagi", async () => {
    const client = new QueryClient();
    client.setQueryData(sessionKeys.account, account);
    const pending = deferred<{ tickets: string[] }>();
    const tickets = client.fetchQuery({ queryKey: ["ticket", "my-tickets"], queryFn: () => pending.promise });

    await clearAfterSignOut(client);
    pending.resolve({ tickets: ["TKT-1"] });
    await tickets.catch(() => undefined);
    await flush();

    expect(client.getQueryData(["ticket", "my-tickets"])).toBeUndefined();
  });

  // Cermin dari balapan keluar: pemeriksaan sesi sebagai tamu yang masih di jalan saat login selesai.
  it("masuk: respons sesi tamu yang masih di jalan tidak menimpa akun yang baru masuk", async () => {
    const client = new QueryClient();
    client.setQueryData(sessionKeys.account, null);
    const pending = deferred<typeof account | null>();
    const staleCheck = client.fetchQuery({ queryKey: sessionKeys.account, queryFn: () => pending.promise });

    await refreshAfterSignIn(client);
    pending.resolve(null);
    await staleCheck.catch(() => undefined);
    await flush();

    // Tetap usang, jadi navbar route mana pun memuat ulang sesi saat tampil, bukan memakai `null` sebagai data segar.
    expect(client.getQueryState(sessionKeys.account)?.isInvalidated).toBe(true);
    expect(client.getQueryState(sessionKeys.account)?.fetchStatus).toBe("idle");
  });
});
