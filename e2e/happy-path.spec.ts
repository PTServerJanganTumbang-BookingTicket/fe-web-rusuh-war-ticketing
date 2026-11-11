import { expect, test } from "@playwright/test";
import { passQueue, pickVipAndContinue, installFakeClock } from "./helpers";

test.describe("Alur utama", () => {
  test("Home → antrian → pilih tiket → bayar e-wallet → berhasil", async ({ page }) => {
    await installFakeClock(page);

    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Event Mendatang" })).toBeVisible();
    await page
      .getByRole("link", { name: /Masuk Antrian/ })
      .first()
      .click();

    await expect(page.getByText(/^#[\d.]+$/)).toBeVisible();
    await passQueue(page);

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

    await page.getByRole("radio", { name: /Virtual Account/ }).click();
    await page.getByRole("button", { name: "BCA" }).click();
    await page.getByRole("button", { name: "Bayar Sekarang" }).click();
    await expect(page.getByText("Nomor Virtual Account BCA")).toBeVisible();

    await page.getByRole("button", { name: "Simulasikan gagal" }).click();
    await expect(
      page.getByText("Pembayaran sebelumnya gagal. Pilih metode lagi untuk mencoba ulang."),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Bayar Sekarang" })).toBeVisible();
  });
});
