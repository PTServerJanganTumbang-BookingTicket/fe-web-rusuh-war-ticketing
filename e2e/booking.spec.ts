import { expect, test } from "@playwright/test";
import { confirmOrder, passQueue, installFakeClock } from "./helpers";

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

  test("email pemesan tamu dibatasi 50 karakter", async ({ page }) => {
    const email = page.getByRole("textbox", { name: "Email" });
    await expect(email).toHaveAttribute("maxlength", "50");
    await email.fill(`${"a".repeat(60)}@example.com`);
    expect((await email.inputValue()).length).toBe(50);
  });

  test("sebelum bayar ada ringkasan pesanan; Periksa lagi menutupnya tanpa membuat booking", async ({
    page,
  }) => {
    await page.getByRole("textbox", { name: "Email" }).fill("rina@example.com");
    await page.getByRole("button", { name: "Tambah tiket VIP" }).click();
    const nik = page.getByRole("textbox", { name: "NIK tiket 1" });
    await nik.fill("3171000000000033");
    await nik.blur();
    await expect(page.getByText("Terverifikasi atas nama JANE DOE")).toBeVisible();

    await page.getByRole("button", { name: "Lanjut ke Pembayaran" }).click();
    const dialog = page.getByRole("dialog", { name: "Periksa pesananmu" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("rina@example.com")).toBeVisible();
    await expect(dialog.getByText("VIP × 1")).toBeVisible();
    await expect(dialog.getByText("Total bayar")).toBeVisible();

    await dialog.getByRole("button", { name: "Periksa lagi" }).click();
    await expect(dialog).toBeHidden();
    await expect(page).toHaveURL(/\/events\/evt_konser_a\/book$/);

    await confirmOrder(page);
    await expect(page).toHaveURL(/\/orders\/RB-\d+\/pay$/);
  });

  test("peringatan merah di 60 detik terakhir", async ({ page }) => {
    // Jam nyata ikut berjalan di bawah jam palsu, jadi nilai awal hanya dicek rentangnya.
    await expect(page.getByRole("timer")).toHaveText(/^0[45]:\d\d$/);
    await page.clock.runFor(245_000);
    await expect(page.getByText("Sisa waktu kurang dari 1 menit")).toBeVisible();
  });
});
