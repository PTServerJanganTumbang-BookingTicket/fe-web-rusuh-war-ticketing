import { expect, test, type Page } from "@playwright/test";
import { installFakeClock, passQueue, pickVipAndContinue } from "./helpers";

/**
 * Cek responsif lintas viewport (small-mobile, tablet, desktop, wide-desktop; lihat playwright.config.ts).
 * Setiap layar penting diperiksa: tanpa scroll horizontal, tanpa elemen keluar viewport,
 * target sentuh cukup besar, dan tanpa error di console.
 */

const MIN_TARGET_PX = 24; // WCAG 2.2 SC 2.5.8 (Target Size, Minimum)

async function overflowReport(page: Page) {
  return page.evaluate(() => {
    const doc = document.documentElement;
    const width = doc.clientWidth;
    const offenders: string[] = [];
    for (const el of Array.from(document.body.querySelectorAll<HTMLElement>("*"))) {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      const style = getComputedStyle(el);
      if (style.position === "fixed" || style.visibility === "hidden" || style.display === "none") continue;
      // Konten di dalam kontainer yang memang bisa di-scroll sendiri tidak dihitung.
      let scrollable = false;
      for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
        const ox = getComputedStyle(p).overflowX;
        if (ox === "auto" || ox === "scroll" || ox === "hidden" || ox === "clip") {
          scrollable = true;
          break;
        }
      }
      if (scrollable) continue;
      if (rect.right > width + 1 || rect.left < -1) {
        offenders.push(
          `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 60)} [${Math.round(rect.left)}..${Math.round(rect.right)}]`,
        );
      }
    }
    return { scrollWidth: doc.scrollWidth, clientWidth: width, offenders: offenders.slice(0, 5) };
  });
}

async function smallTargets(page: Page) {
  return page.evaluate((min) => {
    const bad: string[] = [];
    const nodes = document.querySelectorAll<HTMLElement>(
      "button, a[href], input:not([type=hidden]), [role=button], [role=radio], [role=checkbox]",
    );
    for (const el of Array.from(nodes)) {
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      if (rect.width === 0 || rect.height === 0 || style.visibility === "hidden") continue;
      // Tautan di dalam teks berjalan dikecualikan oleh WCAG (inline).
      if (el.tagName === "A" && style.display === "inline") continue;
      // Input bawaan yang disembunyikan secara visual (sr-only) dan kotak centang/radio yang area sentuhnya
      // diperluas lewat ::after dikecualikan; area itu diuji lewat labelnya.
      if (rect.width <= 1 && rect.height <= 1) continue;
      if (el.matches("[data-slot=checkbox], [data-slot=radio-group-item], [role=checkbox], [role=radio]"))
        continue;
      if (rect.width < min || rect.height < min) {
        bad.push(
          `${el.tagName.toLowerCase()} "${(el.getAttribute("aria-label") ?? el.textContent ?? "").trim().slice(0, 30)}" ${Math.round(rect.width)}x${Math.round(rect.height)}`,
        );
      }
    }
    return bad;
  }, MIN_TARGET_PX);
}

async function expectResponsive(page: Page) {
  const report = await overflowReport(page);
  expect(report.scrollWidth, `scroll horizontal: ${report.offenders.join(" | ")}`).toBeLessThanOrEqual(
    report.clientWidth,
  );
  expect(report.offenders, "elemen keluar viewport").toEqual([]);
  expect(await smallTargets(page), `target sentuh < ${MIN_TARGET_PX}px`).toEqual([]);
}

function trackConsoleErrors(page: Page) {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(`${msg.text()} ${msg.location().url}`);
  });
  page.on("pageerror", (err) => errors.push(err.message));
  return errors;
}

// 401 muncul dari pengecekan sesi pengunjung anonim (refresh token tidak ada); itu perilaku normal.
function isUnexpectedError(message: string) {
  // Stream SSE mock kadang tidak dicegat service worker MSW saat jam palsu aktif; controller beralih ke polling.
  if (/ERR_NAME_NOT_RESOLVED https:\/\/api\.rusuh\.test\/.+\/queue\/stream/.test(message)) return false;
  return !/favicon|Download the React DevTools|status of 401/.test(message);
}

const PUBLIC_PAGES: Array<{ path: string; ready: RegExp | string }> = [
  { path: "/", ready: "Event Mendatang" },
  { path: "/login", ready: "Kirim link login" },
  { path: "/register", ready: "Buat akun" },
  { path: "/register/verify-email", ready: "Verifikasi emailmu untuk melanjutkan" },
  { path: "/help", ready: "Pusat bantuan" },
  { path: "/terms", ready: "Syarat dan Ketentuan" },
  { path: "/privacy", ready: "Kebijakan Privasi" },
];

test.describe("Responsif: halaman publik", () => {
  for (const { path, ready } of PUBLIC_PAGES) {
    test(`${path} tidak overflow dan target sentuh memadai`, async ({ page }) => {
      const errors = trackConsoleErrors(page);
      await page.goto(path);
      await expect(page.getByText(ready).first()).toBeVisible();
      await expectResponsive(page);
      expect(errors.filter(isUnexpectedError)).toEqual([]);
    });
  }

  test("kerangka halaman: header terlihat dan footer bisa dijangkau tanpa scroll horizontal", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByRole("banner")).toBeVisible();
    const footer = page.getByRole("contentinfo");
    // Gambar yang memuat belakangan menggeser layout; ulangi scroll sampai footer benar-benar terlihat.
    await expect(async () => {
      await footer.scrollIntoViewIfNeeded();
      await expect(footer).toBeInViewport();
    }).toPass();
  });

  test("teks tidak terpotong: zoom 200% (setara viewport setengah) tetap tanpa overflow", async ({
    page,
  }) => {
    const size = page.viewportSize()!;
    await page.setViewportSize({ width: Math.max(320, Math.floor(size.width / 2)), height: size.height });
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Event Mendatang" })).toBeVisible();
    const { scrollWidth, clientWidth } = await overflowReport(page);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });
});

test.describe("Responsif: alur pembelian", () => {
  test("antrian → pilih tiket → pembayaran → sukses tetap rapi di tiap layar", async ({ page }) => {
    const errors = trackConsoleErrors(page);
    await installFakeClock(page);

    await page.goto("/events/evt_konser_a/queue");
    await expect(page.getByText("Posisi antrian Anda saat ini")).toBeVisible();
    await expectResponsive(page);

    await passQueue(page);
    await expect(page.getByRole("button", { name: "Tambah tiket VIP" })).toBeVisible();
    await expectResponsive(page);

    await pickVipAndContinue(page);
    await expect(page.getByRole("button", { name: "Bayar Sekarang" })).toBeVisible();
    await expectResponsive(page);

    await page.getByRole("radio", { name: "E-Wallet" }).click();
    await page.getByRole("button", { name: "Bayar Sekarang" }).click();
    await expect(page.getByRole("img", { name: "QR pembayaran contoh" })).toBeVisible();
    await expectResponsive(page);

    await page.getByRole("button", { name: "Simulasikan berhasil" }).click();
    await expect(page.getByRole("heading", { name: "Pembayaran Berhasil!" })).toBeVisible();
    await expectResponsive(page);

    expect(errors.filter(isUnexpectedError)).toEqual([]);
  });

  test("tombol aksi utama selalu dapat dijangkau (tidak tertutup sticky bar)", async ({ page }) => {
    await installFakeClock(page);
    await passQueue(page);
    await page.getByRole("button", { name: "Tambah tiket VIP" }).click();
    const next = page.getByRole("button", { name: "Lanjut ke Pembayaran" });
    await next.scrollIntoViewIfNeeded();
    await expect(next).toBeInViewport({ ratio: 0.9 });
    const box = await next.boundingBox();
    const size = page.viewportSize()!;
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(size.width);
  });
});

test.describe("Responsif: navigasi", () => {
  test("tautan utama selalu terjangkau: navbar di layar lebar, menu panel di layar sempit", async ({
    page,
  }) => {
    await page.goto("/");
    const narrow = (page.viewportSize()?.width ?? 1280) < 768; // breakpoint `md`
    if (narrow) {
      await page.getByRole("button", { name: "Menu" }).click();
      const panel = page.getByRole("dialog");
      for (const name of ["Jelajahi event", "Tiket saya", "Bantuan"]) {
        await expect(panel.getByRole("link", { name })).toBeVisible();
      }
      await panel.getByRole("link", { name: "Bantuan" }).click();
      await expect(page).toHaveURL(/\/help$/);
      await expect(page.getByRole("dialog")).toHaveCount(0);
    } else {
      for (const name of ["Jelajahi event", "Tiket saya", "Bantuan"]) {
        await expect(page.getByRole("navigation").getByRole("link", { name })).toBeVisible();
      }
    }
  });
});

test.describe("Responsif: dialog", () => {
  test("dialog Konfirmasi register muat di layar dan bisa ditutup keyboard", async ({ page }) => {
    await page.goto("/register");
    await page.getByRole("textbox", { name: /Alamat email/ }).fill("rina@example.com");
    await page.getByRole("textbox", { name: /^NIK/ }).fill("3171000000000044");
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Buat akun" }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    const box = (await dialog.boundingBox())!;
    const size = page.viewportSize()!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(size.width);
    expect(box.y).toBeGreaterThanOrEqual(0);
    // Dialog lebih tinggi dari layar harus bisa di-scroll sendiri, bukan terpotong.
    const scrollable = await dialog.evaluate((el) => el.scrollHeight > el.clientHeight);
    if (box.y + box.height > size.height) expect(scrollable).toBe(true);
    await expect(page.getByRole("button", { name: "Konfirmasi & daftar" })).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });
});
