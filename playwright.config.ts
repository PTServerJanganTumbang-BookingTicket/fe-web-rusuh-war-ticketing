import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.PORT ?? 3000);
// Lokal memakai Chrome yang terpasang; CI memasang Chromium bawaan Playwright.
const channel = process.env.CI ? undefined : "chrome";
const RESPONSIVE_SPECS = [/responsive\.spec\.ts/, /happy-path\.spec\.ts/];

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : 3,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"]],
  timeout: 90_000,
  expect: { timeout: 20_000 },
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "on-first-retry",
  },
  projects: [
    {
      // Layout mobile adalah target utama (payment page dipakai ulang di WebView).
      name: "mobile-chrome",
      use: { ...devices["Pixel 7"], channel },
    },
    // Viewport lain hanya menjalankan alur utama dan cek responsif, bukan seluruh suite.
    {
      name: "small-mobile",
      testMatch: RESPONSIVE_SPECS,
      use: { ...devices["Pixel 7"], viewport: { width: 360, height: 640 }, channel },
    },
    {
      name: "tablet",
      testMatch: RESPONSIVE_SPECS,
      use: { ...devices["Desktop Chrome"], viewport: { width: 768, height: 1024 }, hasTouch: true, channel },
    },
    {
      name: "desktop",
      testMatch: RESPONSIVE_SPECS,
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 }, channel },
    },
    {
      name: "wide-desktop",
      testMatch: RESPONSIVE_SPECS,
      use: { ...devices["Desktop Chrome"], viewport: { width: 1920, height: 1080 }, channel },
    },
  ],
  // Server dev memakai mock MSW (.env.development). Dipakai ulang bila sudah berjalan.
  webServer: {
    command: `npx --no -- next dev -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
