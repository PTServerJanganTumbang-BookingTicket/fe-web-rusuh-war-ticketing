import { expect, test } from "@playwright/test";
import { EVENT_ID } from "./helpers";

test.describe("Detail event", () => {
  test("kartu Home → detail → tombol antrian → Waiting Room", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Konser A", exact: true }).click();

    await expect(page).toHaveURL(new RegExp(`/events/${EVENT_ID}$`));
    await expect(page.getByRole("heading", { level: 1, name: "Konser A" })).toBeVisible();
    await expect(page.getByText("25 Des 2026", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Kategori tiket" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "VIP" })).toBeVisible();

    await page
      .getByRole("link", { name: /Masuk Antrian/ })
      .locator("visible=true")
      .click();
    await expect(page).toHaveURL(new RegExp(`/events/${EVENT_ID}/queue$`));
    await expect(page.getByText("Posisi antrian Anda saat ini")).toBeVisible();
  });

  test("event yang belum dibuka: tombol nonaktif dengan jadwal buka", async ({ page }) => {
    await page.goto("/events/evt_konser_c");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Buka / }).locator("visible=true")).toBeDisabled();
    await expect(page.getByRole("link", { name: /Masuk Antrian/ })).toHaveCount(0);
  });

  test("event tidak ada: layar tidak ditemukan dengan jalan ke Beranda", async ({ page }) => {
    await page.goto("/events/evt_tidak_ada");
    await expect(page.getByText("Event tidak ditemukan", { exact: true })).toBeVisible();
    await page.getByRole("link", { name: "Kembali ke Beranda" }).click();
    await expect(page).toHaveURL("/");
  });
});
