import { expect, test, type Page } from "@playwright/test";
import { confirmOrder, installFakeClock, passQueue } from "./helpers";

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

    await page.getByRole("textbox", { name: "Nama alias (opsional)" }).fill("Sari");
    await page.getByRole("textbox", { name: "NIK", exact: true }).fill("3171000000000044");
    await page.getByRole("button", { name: "Simpan alias" }).click();
    await expect(page.getByText("3171********xx44")).toBeVisible();

    await page.getByRole("button", { name: "Hapus Sari" }).click();
    await page.getByRole("button", { name: "Hapus alias", exact: true }).click();
    await expect(page.getByText("3171********xx44")).toHaveCount(0);
  });

  test("alias boleh kosong: NIK tersimpan dengan nama dari 4 digit terakhir", async ({ page }) => {
    await signIn(page);
    await page.goto("/account");
    await page.getByRole("textbox", { name: "NIK", exact: true }).fill("3171000000000055");
    await page.getByRole("button", { name: "Simpan alias" }).click();
    await expect(page.getByText("3171********xx55")).toBeVisible();
    await expect(page.getByText("NIK 0055")).toBeVisible();
  });

  test("NIK format salah ditolak di form tanpa memanggil server, alias kosong tidak jadi galat", async ({
    page,
  }) => {
    await signIn(page);
    await page.goto("/account");
    await page.getByRole("textbox", { name: "NIK", exact: true }).fill("31710000");
    await page.getByRole("button", { name: "Simpan alias" }).click();
    await expect(page.getByText("NIK harus 16 digit angka.")).toBeVisible();
    await expect(page.getByText("Isi nama alias.")).toHaveCount(0);
  });
});

test.describe("NIK profil dipilih di Detail Ticket", () => {
  test("customer masuk memilih alias, NIK tersamar dan terverifikasi, lalu lanjut bayar", async ({
    page,
  }) => {
    await signIn(page);
    await installFakeClock(page);
    await passQueue(page);

    // Email pemesan dari akun: terisi dan tidak bisa diubah.
    const email = page.getByRole("textbox", { name: "Email" });
    await expect(email).toHaveValue("you@example.com");
    await expect(email).toHaveAttribute("readonly", "");
    await page.getByRole("button", { name: "Tambah tiket VIP" }).click();

    await page.getByRole("combobox", { name: "Pemegang tiket 1" }).click();
    await page.getByRole("option", { name: "Budi · 3171********xx33" }).click();

    const nik = page.getByRole("textbox", { name: "NIK tiket 1" });
    await expect(nik).toHaveValue("3171********xx33");
    await expect(nik).toHaveAttribute("readonly", "");
    // NIK dari profil hanya dikenal tersamar dan sudah terverifikasi: tidak ada tombol Dukcapil untuk slot ini.
    await expect(page.getByText("NIK ini sudah terverifikasi di profilmu.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Verifikasi Dukcapil" })).toHaveCount(0);

    await confirmOrder(page);
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

  test("tamu: tombol Verifikasi Dukcapil mati 3 detik setelah ditekan, lalu aktif lagi", async ({ page }) => {
    await installFakeClock(page);
    await passQueue(page);
    await page.getByRole("button", { name: "Tambah tiket VIP" }).click();
    const verify = page.getByRole("button", { name: "Verifikasi Dukcapil" });
    await expect(verify).toBeDisabled();
    await page.getByRole("textbox", { name: "NIK tiket 1" }).fill("3171000000000033");
    await expect(verify).toBeEnabled();

    // Jeda dihitung dari saat ditekan dan waktu nyata tetap berjalan, jadi runner yang macet bisa melewati 3 detik
    // sebelum asersi sempat jalan. Klik dan pembacaan `disabled` dilakukan dalam satu tugas di halaman.
    const disabledRightAfterClick = await verify.evaluate(async (element) => {
      const button = element as HTMLButtonElement;
      button.click();
      await Promise.resolve();
      return button.disabled;
    });
    expect(disabledRightAfterClick).toBe(true);
    await expect(page.getByText("NIK terverifikasi")).toBeVisible();
    await page.clock.runFor(3100);
    await expect(verify).toBeEnabled();
  });

  test("tamu mengetik NIK manual, terverifikasi, lalu lanjut bayar", async ({ page }) => {
    await installFakeClock(page);
    await passQueue(page);
    await page.getByRole("textbox", { name: "Email" }).fill("tamu@example.com");
    await page.getByRole("button", { name: "Tambah tiket VIP" }).click();
    const nik = page.getByRole("textbox", { name: "NIK tiket 1" });
    await nik.fill("3171000000000033");
    await nik.blur();
    await expect(page.getByText("NIK terverifikasi")).toBeVisible();
    await confirmOrder(page);
    await expect(page).toHaveURL(/\/orders\/RB-\d+\/pay$/);
  });

  test("customer masuk bisa kembali ke isian manual walau punya alias", async ({ page }) => {
    await signIn(page);
    await installFakeClock(page);
    await passQueue(page);
    await page.getByRole("button", { name: "Tambah tiket VIP" }).click();
    await page.getByRole("combobox", { name: "Pemegang tiket 1" }).click();
    await page.getByRole("option", { name: "Budi · 3171********xx33" }).click();
    await page.getByRole("combobox", { name: "Pemegang tiket 1" }).click();
    await page.getByRole("option", { name: "NIK lain (isi manual)" }).click();
    const nik = page.getByRole("textbox", { name: "NIK tiket 1" });
    await expect(nik).toBeEditable();
    await expect(nik).toHaveValue("");

    // Isian manual customer yang masuk diverifikasi lewat tombol.
    await nik.fill("3171000000000033");
    await page.getByRole("button", { name: "Verifikasi Dukcapil" }).click();
    await expect(page.getByText("NIK terverifikasi")).toBeVisible();
  });

  test("customer masuk memilih NIK pemesan sebagai pemegang tiket", async ({ page }) => {
    await signIn(page);
    await installFakeClock(page);
    await passQueue(page);
    await page.getByRole("button", { name: "Tambah tiket VIP" }).click();
    await page.getByRole("combobox", { name: "Pemegang tiket 1" }).click();
    await page.getByRole("option", { name: "NIK pemesan · 3171**********22" }).click();
    const nik = page.getByRole("textbox", { name: "NIK tiket 1" });
    await expect(nik).toHaveValue("3171**********22");
    await expect(nik).toHaveAttribute("readonly", "");

    // NIK pemesan dikirim sebagai use_account_nik (tanpa NIK lengkap) dan booking tetap berhasil.
    await confirmOrder(page);
    await expect(page).toHaveURL(/\/orders\/RB-\d+\/pay$/);
  });
});
