import { expect, test, type Page } from "@playwright/test";

/** Tautan utama ada di navbar (layar lebar) atau di menu panel (layar sempit). */
async function openMyTickets(page: Page) {
  const narrow = (page.viewportSize()?.width ?? 1280) < 768; // breakpoint `md`
  if (narrow) {
    await page.getByRole("button", { name: "Menu" }).click();
    await page.getByRole("dialog").getByRole("link", { name: "Tiket saya" }).click();
  } else {
    await page.getByRole("link", { name: "Tiket saya" }).first().click();
  }
  await expect(page).toHaveURL(/\/tickets$/);
}

async function signIn(page: Page) {
  await page.goto("/login/verify#token=abc123");
  await page.getByRole("button", { name: "Masuk sekarang" }).click();
  await expect(page.getByRole("heading", { name: "Kamu sudah masuk" })).toBeVisible();
}

test.describe("Sesi login: navbar dan Tiket Saya", () => {
  test("tamu di Tiket Saya langsung melihat ajakan masuk, bukan kerangka tanpa akhir", async ({ page }) => {
    await page.goto("/tickets");
    await expect(page.getByText("Masuk untuk melihat tiketmu.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Masuk", exact: true }).last()).toHaveAttribute(
      "href",
      "/login",
    );
  });

  test("setelah masuk navbar berubah tanpa reload, Tiket Saya menampilkan tiket tanpa baris kosong", async ({
    page,
  }) => {
    await page.goto("/login/verify#token=abc123");
    await expect(page.getByRole("link", { name: /Profil saya/ })).toHaveCount(0);
    await page.getByRole("button", { name: "Masuk sekarang" }).click();
    await expect(page.getByRole("link", { name: /Profil saya/ })).toBeVisible();

    await openMyTickets(page);
    const card = page.getByRole("link", { name: /Konser A/ }).first();
    await expect(card).toBeVisible();
    await expect(card.getByText("Nomor tiket")).toBeVisible();
    await expect(card.getByText("Harga")).toBeVisible();
    // Kontrak tidak mengirim nama dan NIK di daftar; barisnya tidak boleh tampil kosong.
    await expect(card.getByText("Nama", { exact: true })).toHaveCount(0);
    await expect(card.getByText("NIK", { exact: true })).toHaveCount(0);
  });

  test("tamu yang masuk lalu keluar: navbar kembali tamu, tautan Tiket saya hilang, dan /tickets meminta masuk lagi", async ({
    page,
  }) => {
    await signIn(page);
    await page.goto("/account");
    await page.getByRole("button", { name: "Keluar" }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("link", { name: /Profil saya/ })).toHaveCount(0);
    // Tamu tidak lagi punya tautan "Tiket saya"; membuka /tickets langsung meminta masuk.
    await expect(page.getByRole("link", { name: "Tiket saya" })).toHaveCount(0);
    await page.goto("/tickets");
    await expect(page.getByText("Masuk untuk melihat tiketmu.")).toBeVisible();
  });
});
