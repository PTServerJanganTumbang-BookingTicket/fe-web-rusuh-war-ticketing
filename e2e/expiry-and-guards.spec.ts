import { expect, test } from "@playwright/test";
import {
  advance,
  EVENT_ID,
  OTHER_EVENT_ID,
  passQueue,
  pickVipAndContinue,
  installFakeClock,
} from "./helpers";

test.describe("Kedaluwarsa dan gerbang akses", () => {
  test("waktu booking habis: server menjawab ACCESS_EXPIRED, modal tampil, lalu customer kembali ke Beranda (FR-19, ADR-0005)", async ({
    page,
  }) => {
    await installFakeClock(page);
    await passQueue(page, "?scenario=booking-expiring");
    await expect(page.getByRole("timer")).toBeVisible();

    // TTL mock 75 detik, sebagian sudah terpakai selama antre. Mendekati nol lalu maju per detik: melompat jauh
    // melewati nol juga menghabiskan hitung mundur 5 detik di modal, dan halaman sudah pindah sebelum dicek.
    const dialog = page.getByRole("alertdialog", { name: "Waktu booking habis" });
    await page.clock.runFor(55_000);
    for (let second = 0; second < 25 && !(await dialog.isVisible()); second++) {
      await page.clock.runFor(1000);
    }
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(/diarahkan ke beranda dalam \d detik/)).toBeVisible();

    // Hitung mundur 5 detik, lalu pindah sendiri ke Beranda.
    await advance(page, 6000);
    await expect(page).toHaveURL("/");
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

  test("setelah lolos antrian, membuka Waiting Room lagi diarahkan ke booking (ADR-0007)", async ({
    page,
  }) => {
    await installFakeClock(page);
    await passQueue(page);

    await page.goto(`/events/${EVENT_ID}/queue`);
    await expect(page).toHaveURL(new RegExp(`/events/${EVENT_ID}/book$`));
  });

  test("grant event lain tidak melewati antrian event ini: /book dan Waiting Room event lain dilayani sebagaimana tanpa grant (FR-06)", async ({
    page,
  }) => {
    await installFakeClock(page);
    await passQueue(page);

    await page.goto(`/events/${OTHER_EVENT_ID}/book`);
    await expect(page).toHaveURL(new RegExp(`/events/${OTHER_EVENT_ID}/queue$`));
    // Tetap di Waiting Room event itu, tidak dipantulkan ke /book.
    await page.goto(`/events/${OTHER_EVENT_ID}/queue`);
    await expect(page).toHaveURL(new RegExp(`/events/${OTHER_EVENT_ID}/queue$`));
  });

  test("kembali ke Waiting Room dengan history browser saat grant masih berlaku: langsung ke booking, tanpa antre ulang", async ({
    page,
  }) => {
    await installFakeClock(page);
    await passQueue(page);

    await page.goto("/");
    await page.goBack();
    await expect(page).toHaveURL(new RegExp(`/events/${EVENT_ID}/book$`));
    await expect(page.getByRole("timer")).toBeVisible();
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
