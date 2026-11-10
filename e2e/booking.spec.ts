import { expect, test } from "@playwright/test";
import { passQueue, installFakeClock } from "./helpers";

test.describe("Detail Ticket (FR-11–19, BR-01–04)", () => {
  test.beforeEach(async ({ page }) => {
    await installFakeClock(page);
    await passQueue(page);
  });

  test("form pemesan kosong, stok tampil, dan tombol lanjut mati tanpa tiket", async ({ page }) => {
    await expect(page.getByText("Sisa 12")).toBeVisible();
    await expect(page.getByText("Belum ada tiket dipilih.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Lanjut ke Pembayaran" })).toBeDisabled();
  });

  test("batas 3 tiket lintas kategori, dan stok habis tidak bisa ditambah", async ({ page }) => {
    const add = (name: string) => page.getByRole("button", { name: `Tambah tiket ${name}` });

    await expect(add("Tribune")).toBeDisabled();

    await add("VIP").click();
    await add("VIP").click();
    await add("Festival").click();

    await expect(page.getByText("3 tiket · Maksimal 3 tiket per pesanan")).toBeVisible();
    await expect(add("VIP")).toBeDisabled();
    await expect(add("Festival")).toBeDisabled();

    await page.getByRole("button", { name: "Kurangi tiket VIP" }).click();
    await expect(page.getByText("2 tiket · Maksimal 3 tiket per pesanan")).toBeVisible();
    await expect(add("Festival")).toBeEnabled();
  });

  test("tiket sekategori dikelompokkan: satu judul 'Festival × 2', bukan 'Festival × 1' berulang", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Tambah tiket VIP" }).click();
    await page.getByRole("button", { name: "Tambah tiket Festival" }).click();
    await page.getByRole("button", { name: "Tambah tiket Festival" }).click();

    await expect(page.getByRole("heading", { name: "VIP × 1" })).toHaveCount(1);
    await expect(page.getByRole("heading", { name: "Festival × 2" })).toHaveCount(1);
    await expect(page.getByRole("heading", { name: "Festival × 1" })).toHaveCount(0);
    for (const number of [1, 2, 3]) {
      await expect(page.getByRole("textbox", { name: `NIK tiket ${number}` })).toBeVisible();
    }
  });

  test("peringatan merah di 60 detik terakhir", async ({ page }) => {
    // Jam nyata ikut berjalan di bawah jam palsu, jadi nilai awal hanya dicek rentangnya.
    await expect(page.getByRole("timer")).toHaveText(/^0[45]:\d\d$/);
    await page.clock.runFor(245_000);
    await expect(page.getByText("Sisa waktu kurang dari 1 menit")).toBeVisible();
  });
});
