// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { MOCK_API_BASE_URL } from "@/mocks/handlers";
import { createWrapper, setupMockServer, setupTestContainer } from "@/test/support";
import { useMyTicketsController, useTicketDetailController } from "../ticket.controller";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, replace: vi.fn() }) }));

const server = setupMockServer();

const eticket = {
  ticket_id: "TKT-77",
  event: { name: "Konser A", date: "2026-12-25", time: "19:00", venue: "GBK, Jakarta" },
  category: "VIP",
  holder: { nik_masked: "3171********xx22" },
  qr_code: "data:image/png;base64,AAAA",
  qr_value: "TKT-77|evt_konser_a|3171000000000022",
  instructions: "Tunjukkan QR code.",
};

describe("useTicketDetailController", () => {
  it("pemilik yang masuk melihat detail tiket", async () => {
    server.use(
      http.get(`${MOCK_API_BASE_URL}/tickets/TKT-77/eticket`, () =>
        HttpResponse.json({ meta: { code: 200, message: "Success" }, data: eticket }),
      ),
    );
    const container = setupTestContainer();
    await container.cradle.verifyLoginUseCase("mt_ticket");
    const { result } = renderHook(() => useTicketDetailController("TKT-77"), {
      wrapper: createWrapper(container),
    });
    expect(result.current.kind).toBe("status");
    await waitFor(() => expect(result.current.kind).toBe("ready"));
    if (result.current.kind !== "ready") throw new Error("belum siap");
    expect(result.current.view.eventName).toBe("Konser A");
    expect(result.current.view.qr.src).toMatch(/^data:image\/svg\+xml/);
  });

  it("tamu tanpa token email diajak masuk", async () => {
    push.mockClear();
    const { result } = renderHook(() => useTicketDetailController("TKT-77"), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.kind === "status" && result.current.view.tone).toBe("error"));
    if (result.current.kind !== "status") throw new Error("bukan status");
    expect(result.current.view.message).toBe("Masuk dengan akun pembeli untuk melihat tiket ini.");
    act(() => result.current.kind === "status" && result.current.view.action?.onClick());
    expect(push).toHaveBeenCalledWith("/login");
  });

  it("tiket tidak ditemukan: pesan jelas dan tombol coba lagi", async () => {
    const { result } = renderHook(() => useTicketDetailController("TKT-404", "signed"), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.kind === "status" && result.current.view.tone).toBe("error"));
    if (result.current.kind !== "status") throw new Error("bukan status");
    expect(result.current.view.message).toBe(
      "Tiket tidak ditemukan. Periksa lagi tautan atau buka Tiket Saya.",
    );
    expect(result.current.view.action?.label).toBe("Coba lagi");
  });

  it("jaringan putus: pesan koneksi, coba lagi memuat ulang dan berhasil", async () => {
    let attempts = 0;
    server.use(
      http.get(`${MOCK_API_BASE_URL}/tickets/TKT-77/eticket`, () => {
        attempts += 1;
        if (attempts === 1) return HttpResponse.error();
        return HttpResponse.json({ meta: { code: 200, message: "Success" }, data: eticket });
      }),
    );
    const { result } = renderHook(() => useTicketDetailController("TKT-77", "signed"), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.kind === "status" && result.current.view.tone).toBe("error"));
    if (result.current.kind !== "status") throw new Error("bukan status");
    expect(result.current.view.message).toBe("Koneksi terputus. Periksa internet lalu coba lagi.");
    act(() => result.current.kind === "status" && result.current.view.action?.onClick());
    await waitFor(() => expect(result.current.kind).toBe("ready"));
    expect(attempts).toBe(2);
  });

  it("galat server tak dikenal: pesan umum", async () => {
    server.use(
      http.get(`${MOCK_API_BASE_URL}/tickets/TKT-77/eticket`, () => new HttpResponse(null, { status: 500 })),
    );
    const { result } = renderHook(() => useTicketDetailController("TKT-77", "signed"), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.kind === "status" && result.current.view.tone).toBe("error"));
    if (result.current.kind !== "status") throw new Error("bukan status");
    expect(result.current.view.message).toBe("Tiket belum bisa dimuat. Coba lagi sebentar lagi.");
  });
});

describe("useMyTicketsController", () => {
  it("tamu: galat UNAUTHENTICATED langsung muncul tanpa mencoba ulang", async () => {
    const { result } = renderHook(() => useMyTicketsController(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.error).toMatchObject({ kind: "api", code: "UNAUTHENTICATED" }));
    expect(result.current.tickets).toEqual([]);
    expect(result.current.total).toBe(0);
  });

  it("customer masuk: daftar tiket dan total dari server", async () => {
    const container = setupTestContainer();
    await container.cradle.verifyLoginUseCase("mt_my_tickets");
    const { result } = renderHook(() => useMyTicketsController(), { wrapper: createWrapper(container) });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBeNull();
    expect(result.current.total).toBe(result.current.tickets.length);
  });
});
