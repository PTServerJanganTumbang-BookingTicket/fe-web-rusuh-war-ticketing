import { expect, test } from "@playwright/test";

test.describe("Register (FR-30, FR-31)", () => {
  test("tombol Buat akun abu-abu sampai email, NIK, dan persetujuan valid, lalu verifikasi email", async ({
    page,
  }) => {
    await page.goto("/register");
    const submit = page.getByRole("button", { name: "Buat akun" });
    await expect(submit).toBeDisabled();

    await page.getByRole("textbox", { name: /Alamat email/ }).fill("rina@example");
    await page.getByRole("textbox", { name: /^NIK/ }).fill("3171000000000044");
    await page.getByRole("checkbox").check();
    await expect(submit).toBeDisabled();
    await page.getByRole("textbox", { name: /Alamat email/ }).fill("rina@example.com");
    await expect(submit).toBeEnabled();

    await submit.click();
    await expect(page.getByRole("heading", { name: "Konfirmasi datamu" })).toBeVisible();
    await page.getByRole("button", { name: "Konfirmasi & daftar" }).click();
    await expect(page.getByRole("heading", { name: "Pendaftaran berhasil" })).toBeVisible();
    await page.getByRole("button", { name: "Mengerti" }).click();
    await expect(page).toHaveURL(/\/register\/verify-email$/);
    await expect(page.getByRole("heading", { name: "Verifikasi emailmu untuk melanjutkan" })).toBeVisible();
  });

  test("persetujuan menaut ke Syarat dan Ketentuan serta Kebijakan Privasi", async ({ page, context }) => {
    await page.goto("/register");
    const terms = page.getByRole("link", { name: "Syarat dan Ketentuan" }).first();
    await expect(terms).toHaveAttribute("href", "/terms");
    await expect(page.getByRole("link", { name: "Kebijakan Privasi" }).first()).toHaveAttribute(
      "href",
      "/privacy",
    );
    const [popup] = await Promise.all([context.waitForEvent("page"), terms.click()]);
    await expect(popup.getByRole("heading", { level: 1, name: "Syarat dan Ketentuan" })).toBeVisible();
  });
});

test.describe("Login (FR-29)", () => {
  test("email tidak valid menonaktifkan tombol kirim link", async ({ page }) => {
    await page.goto("/login");
    const email = page.getByRole("textbox", { name: /Alamat email/ });
    const submit = page.getByRole("button", { name: "Kirim link login" });
    await expect(submit).toBeDisabled();
    await email.fill("bukan-email");
    await email.blur();
    await expect(page.getByText("Masukkan alamat email yang valid.")).toBeVisible();
    await expect(submit).toBeDisabled();
    await email.fill("rina@example.com");
    await expect(submit).toBeEnabled();
  });
});

test.describe("Verifikasi email dari tautan (FR-31)", () => {
  test("token valid: email terverifikasi, tanpa sesi login", async ({ page }) => {
    await page.goto("/register/verified?token=abc123");
    await expect(page.getByRole("heading", { name: "Emailmu sudah terverifikasi" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Lanjut ke halaman masuk" })).toHaveAttribute(
      "href",
      "/login",
    );
  });

  test("token kedaluwarsa: tautan tidak berlaku dan arahan minta link login", async ({ page }) => {
    await page.goto("/register/verified?token=expired");
    await expect(page.getByRole("heading", { name: "Link verifikasi tidak berlaku" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Minta link login" })).toHaveAttribute("href", "/login");
  });

  test("tanpa token: tidak mengklaim terverifikasi", async ({ page }) => {
    await page.goto("/register/verified");
    await expect(page.getByRole("heading", { name: "Link verifikasi tidak berlaku" })).toBeVisible();
  });
});

test.describe("Dokumen hukum", () => {
  test("Syarat dan Ketentuan serta Kebijakan Privasi saling menaut dan terbuka dari footer", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("contentinfo").getByRole("link", { name: "Kebijakan Privasi" }).click();
    await expect(page).toHaveURL(/\/privacy$/);
    await expect(page.getByRole("heading", { level: 1, name: "Kebijakan Privasi" })).toBeVisible();
    await expect(page.getByRole("heading", { name: /NIK orang lain/ })).toBeVisible();
    await page.getByRole("article").getByRole("link", { name: "Syarat dan Ketentuan" }).click();
    await expect(page).toHaveURL(/\/terms$/);
  });
});

test.describe("Batas NIK 16 digit", () => {
  test("isian NIK menolak karakter setelah digit ke-16", async ({ page }) => {
    await page.goto("/register");
    const nik = page.getByRole("textbox", { name: /^NIK/ });
    await nik.pressSequentially("31710000000000449999");
    await expect(nik).toHaveValue("3171000000000044");
    await expect(nik).toHaveAttribute("maxlength", "16");
  });
});
