import { expect, test, type Page } from "@playwright/test";
import { installFakeClock, passQueue } from "./helpers";

async function signIn(page: Page) {
  await page.goto("/login/verify#token=abc123");
  await page.getByRole("button", { name: "Masuk sekarang" }).click();
  await expect(page.getByRole("heading", { name: "Kamu sudah masuk" })).toBeVisible();
}

test.describe("Alias NIK di profil", () => {
  test("alias baru (nama + NIK) muncul dengan NIK tersamar lalu bisa dihapus", async ({ page }) => {
    await signIn(page);
    await page.goto("/account");
    await expect(page.getByText("Budi", { exact: true })).toBeVisible();
    await expect(page.getByText("3171********xx33")).toBeVisible();

    await page.getByRole("textbox", { name: "Nama alias" }).fill("Sari");
    await page.getByRole("textbox", { name: "NIK", exact: true }).fill("3171000000000044");
    await page.getByRole("button", { name: "Simpan alias" }).click();
    await expect(page.getByText("3171********xx44")).toBeVisible();

    await page.getByRole("button", { name: "Hapus Sari" }).click();
    await page.getByRole("button", { name: "Hapus alias", exact: true }).click();
    await expect(page.getByText("3171********xx44")).toHaveCount(0);
  });

  test("nama alias kosong dan NIK format salah ditolak di form tanpa memanggil server", async ({ page }) => {
    await signIn(page);
    await page.goto("/account");
    await page.getByRole("textbox", { name: "NIK", exact: true }).fill("31710000");
    await page.getByRole("button", { name: "Simpan alias" }).click();
    await expect(page.getByText("Isi nama alias.")).toBeVisible();
    await expect(page.getByText("NIK harus 16 digit angka.")).toBeVisible();
  });
});

test.describe("NIK profil dipilih di Detail Ticket", () => {
  test("customer masuk memilih alias, NIK tersamar dan terverifikasi, lalu lanjut bayar", async ({
    page,
  }) => {
    await signIn(page);
    await installFakeClock(page);
    await passQueue(page);

    await page.getByRole("textbox", { name: "Email" }).fill("rina@example.com");
    await page.getByRole("button", { name: "Tambah tiket VIP" }).click();

    await page.getByRole("combobox", { name: "Pemegang tiket 1" }).click();
    await page.getByRole("option", { name: "Budi · 3171********xx33" }).click();

    const nik = page.getByRole("textbox", { name: "NIK tiket 1" });
    await expect(nik).toHaveValue("3171********xx33");
    await expect(nik).toHaveAttribute("readonly", "");
    await expect(page.getByText("Terverifikasi atas nama JANE DOE")).toBeVisible();

    await page.getByRole("button", { name: "Lanjut ke Pembayaran" }).click();
    await expect(page).toHaveURL(/\/orders\/RB-\d+\/pay$/);
  });

  test("alias yang NIK-nya sudah dipakai tiket lain tidak bisa dipilih lagi (BR-02)", async ({ page }) => {
    await signIn(page);
    await installFakeClock(page);
    await passQueue(page);

    await page.getByRole("button", { name: "Tambah tiket VIP" }).click();
    await page.getByRole("button", { name: "Tambah tiket VIP" }).click();
    await page.getByRole("combobox", { name: "Pemegang tiket 1" }).click();
    await page.getByRole("option", { name: "Budi · 3171********xx33" }).click();

    await page.getByRole("combobox", { name: "Pemegang tiket 2" }).click();
    await expect(
      page.getByRole("option", { name: "Budi · 3171********xx33 (sudah dipakai tiket lain)" }),
    ).toHaveAttribute("aria-disabled", "true");
  });

  test("tamu tidak melihat pilihan alias, hanya isian manual", async ({ page }) => {
    await installFakeClock(page);
    await passQueue(page);
    await page.getByRole("button", { name: "Tambah tiket VIP" }).click();
    await expect(page.getByRole("textbox", { name: "NIK tiket 1" })).toBeEditable();
    await expect(page.getByRole("combobox", { name: "Pemegang tiket 1" })).toHaveCount(0);
  });
});
