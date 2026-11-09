import { expect, test } from "@playwright/test";
import { EVENT_ID } from "./helpers";

test.describe("Join antrian dengan CAPTCHA (FR-06)", () => {
  test("join mengirim captcha_token dan antrian tampil", async ({ page }) => {
    const bodies: unknown[] = [];
    page.on("request", (request) => {
      if (request.method() === "POST" && request.url().endsWith(`/events/${EVENT_ID}/queue/join`)) {
        bodies.push(request.postDataJSON());
      }
    });
    await page.goto(`/events/${EVENT_ID}/queue`);
    await expect(page.getByText(/^#[\d.]+$/)).toBeVisible();
    // Mode mock tidak memuat skrip Turnstile; tokennya token mock.
    expect(bodies[0]).toEqual({ captcha_token: "mock-captcha-token" });
  });
});
