import { describe, expect, it, vi } from "vitest";
import { AppFailure } from "@/core/domain/app-error";
import { eticketQueryOptions, myTicketsQueryOptions, ticketKeys } from "../ticket.queries";

describe("myTicketsQueryOptions", () => {
  const options = myTicketsQueryOptions({ getMyTicketsUseCase: vi.fn() });
  const retry = options.retry as (count: number, error: unknown) => boolean;

  it("tamu (UNAUTHENTICATED) tidak dicoba ulang supaya ajakan masuk tampil segera", () => {
    const guest = new AppFailure({ kind: "api", code: "UNAUTHENTICATED", status: 401 });
    expect(retry(0, guest)).toBe(false);
  });

  it("galat lain dicoba ulang maksimal dua kali", () => {
    const network = new AppFailure({ kind: "network" });
    expect(retry(0, network)).toBe(true);
    expect(retry(1, network)).toBe(true);
    expect(retry(2, network)).toBe(false);
  });

  it("memakai kunci dan staleTime yang stabil", () => {
    expect(options.queryKey).toEqual(ticketKeys.myTickets());
    expect(options.staleTime).toBe(30_000);
  });
});

describe("eticketQueryOptions", () => {
  it("meneruskan token akses ke use case dan memisahkan cache per tiket", async () => {
    const getTicketUseCase = vi.fn().mockResolvedValue({});
    const options = eticketQueryOptions({ getTicketUseCase, ticketId: "TKT-1", accessToken: "t" });
    expect(options.queryKey).toEqual(ticketKeys.eticket("TKT-1"));
    await (options.queryFn as () => Promise<unknown>)();
    expect(getTicketUseCase).toHaveBeenCalledWith("TKT-1", "t");
  });
});
