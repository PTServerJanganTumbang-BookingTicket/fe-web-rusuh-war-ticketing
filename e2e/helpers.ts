import { expect, type Page } from "@playwright/test";

export const EVENT_ID = "evt_konser_a";
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
  await expect(page).toHaveURL(/\/events\/evt_konser_a\/book$/);
}

export async function pickVipAndContinue(page: Page) {
  await page.getByRole("textbox", { name: "Email" }).fill("rina@example.com");
  await page.getByRole("button", { name: "Tambah tiket VIP" }).click();
  const nik = page.getByRole("textbox", { name: "NIK tiket 1" });
  await nik.fill("3171000000000033");
  await nik.blur();
  await expect(page.getByText("Terverifikasi atas nama JANE DOE")).toBeVisible();
  await page.getByRole("button", { name: "Lanjut ke Pembayaran" }).click();
  await expect(page).toHaveURL(/\/orders\/RB-\d+\/pay$/);
}
