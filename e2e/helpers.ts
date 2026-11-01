import { expect, type Page } from "@playwright/test";

export const EVENT_ID = "evt-konser-rusuh";
export const FAKE_NOW = new Date("2026-10-19T10:00:00.000Z");

/** Jam palsu (testing.md): waktu hanya maju lewat `page.clock`, tanpa sleep. */
export async function installFakeClock(page: Page) {
  await page.clock.install({ time: FAKE_NOW });
}

/** Maju per langkah kecil agar timer berantai (polling, countdown) sempat berjalan. */
export async function advance(page: Page, totalMs: number, stepMs = 1000) {
  for (let elapsed = 0; elapsed < totalMs; elapsed += stepMs) {
    await page.clock.runFor(Math.min(stepMs, totalMs - elapsed));
  }
}

/**
 * Dari Waiting Room sampai masuk otomatis ke Detail Ticket.
 * Jam palsu dimajukan satu interval polling per putaran supaya antrian bergerak cepat; waktu nyata tetap berjalan,
 * jadi putaran ini hanya mempercepat dan tidak bergantung pada kecepatan respons mock.
 */
export async function passQueue(page: Page, query = "") {
  await page.goto(`/events/${EVENT_ID}/queue${query}`);
  await expect(page.getByText(/^#[\d.]+$/)).toBeVisible();

  for (let round = 0; round < 6 && !page.url().includes("/book"); round++) {
    await page.clock.runFor(2500);
  }
  await expect(page).toHaveURL(/\/events\/evt-konser-rusuh\/book$/);
}

export async function pickVipAndContinue(page: Page) {
  await page.getByRole("button", { name: "Tambah tiket VIP" }).click();
  await page.getByRole("button", { name: "Lanjut ke Pembayaran →" }).click();
  await expect(page).toHaveURL(/\/orders\/RB-00912\/pay$/);
}
