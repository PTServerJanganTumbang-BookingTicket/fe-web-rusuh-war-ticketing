import { expect, test } from "@playwright/test";
import { passQueue, installFakeClock } from "./helpers";

test.describe("Detail Ticket (FR-11–19, BR-01–04)", () => {
  test.beforeEach(async ({ page }) => {
    await installFakeClock(page);
    await passQueue(page);
  });

  test("NIK tersamar dari akun dan sisa kuota 3/3", async ({ page }) => {
    await expect(page.getByText("3171••••••••0001")).toBeVisible();
    await expect(page.getByText("sisa 3/3")).toBeVisible();
    await expect(page.getByRole("button", { name: "Lanjut ke Pembayaran →" })).toBeDisabled();
  });

  test("batas 3 tiket lintas kategori, dan stok habis tidak bisa ditambah", async ({ page }) => {
    const add = (name: string) => page.getByRole("button", { name: `Tambah tiket ${name}` });

    await expect(add("Tribune")).toBeDisabled();

    await add("VIP").click();
    await add("VIP").click();
    await add("Festival").click();

    await expect(page.getByText("Total (3 tiket)")).toBeVisible();
    await expect(page.getByText("sisa 0/3")).toBeVisible();
    await expect(add("VIP")).toBeDisabled();
    await expect(add("Festival")).toBeDisabled();
    await expect(page.getByRole("button", { name: "Lanjut ke Pembayaran →" })).toBeEnabled();

    await page.getByRole("button", { name: "Kurangi tiket VIP" }).click();
    await expect(page.getByText("sisa 1/3")).toBeVisible();
    await expect(add("Festival")).toBeEnabled();
  });

  test("peringatan merah di 60 detik terakhir", async ({ page }) => {
    // Jam nyata ikut berjalan di bawah jam palsu, jadi nilai awal hanya dicek rentangnya.
    await expect(page.getByRole("timer")).toHaveText(/^0[45]:\d\d$/);
    await page.clock.runFor(245_000);
    await expect(page.getByText("Sisa waktu kurang dari 1 menit")).toBeVisible();
  });
});
