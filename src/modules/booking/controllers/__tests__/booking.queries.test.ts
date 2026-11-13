import { describe, expect, it, vi } from "vitest";
import { bookingSessionQuery } from "../booking.queries";

type PollQuery = { state: { status: string; data?: { categories: { stock: number }[] } } };

function poll(query: PollQuery) {
  const options = bookingSessionQuery(
    { getBookingSessionUseCase: vi.fn(), random: { next: () => 0 } },
    "evt",
  );
  return (options.refetchInterval as (query: PollQuery) => number | false)(query);
}

describe("bookingSessionQuery polling", () => {
  it("polling sekitar 10 detik dengan jitter selama masih ada stok", () => {
    const interval = poll({
      state: { status: "success", data: { categories: [{ stock: 3 }, { stock: 0 }] } },
    });
    expect(interval).toBeGreaterThanOrEqual(8000);
    expect(interval).toBeLessThanOrEqual(12000);
  });

  it("interval tetap sama di setiap pemanggilan, supaya render ulang tidak memasang ulang timer polling", () => {
    let calls = 0;
    const options = bookingSessionQuery(
      { getBookingSessionUseCase: vi.fn(), random: { next: () => (calls++ % 10) / 10 } },
      "evt",
    );
    const refetchInterval = options.refetchInterval as (query: PollQuery) => number | false;
    const query: PollQuery = { state: { status: "success", data: { categories: [{ stock: 3 }] } } };
    expect(new Set([refetchInterval(query), refetchInterval(query), refetchInterval(query)]).size).toBe(1);
  });

  it("berhenti saat semua kategori habis", () => {
    expect(poll({ state: { status: "success", data: { categories: [{ stock: 0 }, { stock: 0 }] } } })).toBe(
      false,
    );
  });

  it("berhenti saat query berstatus error", () => {
    expect(poll({ state: { status: "error" } })).toBe(false);
  });

  it("tidak berjalan di tab tersembunyi", () => {
    const options = bookingSessionQuery(
      { getBookingSessionUseCase: vi.fn(), random: { next: () => 0 } },
      "evt",
    );
    expect(options.refetchIntervalInBackground).toBe(false);
  });
});
