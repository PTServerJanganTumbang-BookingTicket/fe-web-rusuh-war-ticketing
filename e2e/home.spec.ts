import { expect, test } from "@playwright/test";

test.describe("Home (FR-01–03)", () => {
  test("event aktif bisa dibuka, sold out dinonaktifkan", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: "Konser A" })).toBeVisible();
    await expect(page.getByText("25 Des 2026 · GBK, Jakarta")).toBeVisible();
    await expect(page.getByText("AVAILABLE", { exact: true })).toHaveCount(1);

    await expect(page.getByRole("link", { name: "Beli Tiket →" })).toHaveCount(1);
    await expect(page.getByRole("button", { name: "Antrian Penuh" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Belum Dibuka" })).toBeDisabled();
  });

  test("klik Beli Tiket membuka Waiting Room event tersebut", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Beli Tiket →" }).first().click();
    await expect(page).toHaveURL(/\/events\/evt_konser_a\/queue$/);
    await expect(page.getByText("Posisi antrian Anda saat ini")).toBeVisible();
    await expect(page.getByRole("progressbar")).toBeVisible();
  });
});
