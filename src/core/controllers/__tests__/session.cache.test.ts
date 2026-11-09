import { describe, expect, it } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { clearAfterSignOut, refreshAfterSignIn } from "../session.cache";
import { sessionKeys } from "../session.queries";

const account = { email: "rina@example.com", nikMasked: "3171********0044" };

describe("session.cache", () => {
  it("keluar: navbar jadi tamu dan data milik akun (tiket, NIK tersimpan) dibuang", () => {
    const client = new QueryClient();
    client.setQueryData(sessionKeys.account, account);
    client.setQueryData(["ticket", "my-tickets"], { tickets: [{ id: "TKT-1" }] });
    client.setQueryData(["auth", "saved-niks"], { savedNiks: [] });

    clearAfterSignOut(client);

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
});
