import { expect, test } from "@playwright/test";
import { passQueue, pickVipAndContinue, installFakeClock } from "./helpers";

test.describe("Alur utama", () => {
  test("Home → antrian → pilih tiket → bayar e-wallet → berhasil", async ({ page }) => {
    await installFakeClock(page);

    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Daftar Event" })).toBeVisible();
    await page.getByRole("link", { name: "Beli Tiket →" }).first().click();

    await expect(page.getByText("#1.248")).toBeVisible();
    await expect(page.getByText("± 4 menit")).toBeVisible();
    await passQueue(page);

    await expect(page.getByText("sisa 3/3")).toBeVisible();
    await pickVipAndContinue(page);

    await page.getByRole("radio", { name: "E-Wallet" }).click();
    await page.getByRole("button", { name: "Bayar Sekarang" }).click();
    await expect(page.getByRole("img", { name: "QR pembayaran contoh" })).toBeVisible();

    await page.getByRole("button", { name: "Simulasikan berhasil" }).click();
    await expect(page.getByRole("heading", { name: "Pembayaran Berhasil!" })).toBeVisible();
    await expect(page.getByText("e-Tiket ×1 — VIP")).toBeVisible();
  });

  test("pembayaran virtual account gagal menampilkan status gagal", async ({ page }) => {
    await installFakeClock(page);
    await passQueue(page);
    await pickVipAndContinue(page);

    await page.getByRole("button", { name: "Bayar Sekarang" }).click();
    await expect(page.getByText("8277081234567890")).toBeVisible();

    await page.getByRole("button", { name: "Simulasikan gagal" }).click();
    await expect(page.getByRole("heading", { name: "Pembayaran Gagal" })).toBeVisible();
    await page.getByRole("button", { name: "Kembali ke Home" }).click();
    await expect(page).toHaveURL("/");
  });
});
