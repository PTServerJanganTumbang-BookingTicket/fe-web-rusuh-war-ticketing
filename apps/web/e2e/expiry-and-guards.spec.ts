import { expect, test } from "@playwright/test";
import { EVENT_ID, passQueue, pickVipAndContinue, installFakeClock } from "./helpers";

test.describe("Kedaluwarsa dan gerbang akses", () => {
  test("waktu booking habis: server menjawab ACCESS_EXPIRED lalu customer kembali ke Waiting Room (FR-19, ADR-0005)", async ({ page }) => {
    await installFakeClock(page);
    await passQueue(page, "?scenario=booking-expiring");
    await expect(page.getByRole("timer")).toBeVisible();

    await page.clock.runFor(80_000);

    await expect(page).toHaveURL(new RegExp(`/events/${EVENT_ID}/queue$`));
    await expect(page.getByText("#1.248")).toBeVisible();
  });

  test("waktu pembayaran habis: status expired dari server (FR-23, BR-06)", async ({ page }) => {
    await installFakeClock(page);
    await passQueue(page, "?scenario=payment-expiring");
    await pickVipAndContinue(page);
    await expect(page.getByRole("button", { name: "Bayar Sekarang" })).toBeVisible();

    await page.clock.runFor(50_000);

    await expect(page.getByRole("heading", { name: "Waktu Pembayaran Habis" })).toBeVisible();
    await expect(page.getByText("Tiket dilepas untuk antrian berikutnya.")).toBeVisible();
  });

  test("tanpa token, /book diarahkan ke Waiting Room dan /pay ke Home (ADR-0007)", async ({ page }) => {
    await page.goto(`/events/${EVENT_ID}/book`);
    await expect(page).toHaveURL(new RegExp(`/events/${EVENT_ID}/queue$`));

    await page.goto("/orders/RB-00912/pay");
    await expect(page).toHaveURL("/");
  });

  test("token tidak pernah ada di URL dan cookie bersifat httpOnly (ADR-0008)", async ({ page, context }) => {
    await installFakeClock(page);
    await passQueue(page);

    expect(page.url()).not.toContain("token");
    const cookies = await context.cookies();
    const session = cookies.find((cookie) => cookie.name === "access_token");
    expect(session?.httpOnly).toBe(true);
    expect(await page.evaluate(() => document.cookie)).not.toContain("access_token");
  });

  // Belum ada di UI maupun mock. Diaktifkan saat fiturnya dibangun (testing.md).
  test.fixme("stok habis saat submit: popup dengan stok terbaru", async () => {});
  test.fixme("slot diambil alih tab atau perangkat lain: layar sesi dipindahkan (ADR-0010)", async () => {});
});
