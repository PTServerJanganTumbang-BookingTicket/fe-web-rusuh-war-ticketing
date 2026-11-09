// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AppConfig } from "@/core/domain/app-config.model";
import { createTurnstileCaptchaService, MOCK_CAPTCHA_TOKEN } from "../turnstile-captcha.service";

const config = (mocking: boolean) => ({ mocking }) as AppConfig;
const turnstileConfig = { provider: "turnstile", siteKey: "1x00000000000000000000BB" };

type Options = {
  sitekey: string;
  callback: (token: string) => void;
  "error-callback": () => void;
  "timeout-callback": () => void;
};

function fakeTurnstile(onRender: (options: Options) => void) {
  const remove = vi.fn();
  const render = vi.fn((_container: HTMLElement, options: Options) => {
    queueMicrotask(() => onRender(options));
    return "widget-1";
  });
  (window as unknown as { turnstile: unknown }).turnstile = { render, remove };
  return { render, remove };
}

afterEach(() => {
  delete (window as unknown as { turnstile?: unknown }).turnstile;
  document.body.innerHTML = "";
});

describe("createTurnstileCaptchaService", () => {
  it("event tanpa konfigurasi CAPTCHA menghasilkan token kosong", async () => {
    expect(await createTurnstileCaptchaService({ appConfig: config(false) }).solve(null)).toBe("");
  });

  it("mode mock tidak memuat skrip pihak ketiga", async () => {
    const token = await createTurnstileCaptchaService({ appConfig: config(true) }).solve(turnstileConfig);
    expect(token).toBe(MOCK_CAPTCHA_TOKEN);
    expect(document.querySelector("script")).toBeNull();
  });

  it("provider selain turnstile ditolak sebagai CAPTCHA_FAILED", async () => {
    await expect(
      createTurnstileCaptchaService({ appConfig: config(false) }).solve({ provider: "lain", siteKey: "k" }),
    ).rejects.toMatchObject({ error: { kind: "api", code: "CAPTCHA_FAILED" } });
  });

  it("memasang widget tak terlihat dengan site key event, mengembalikan token, lalu membersihkan widget", async () => {
    const { render, remove } = fakeTurnstile((options) => options.callback("token-asli"));
    const token = await createTurnstileCaptchaService({ appConfig: config(false) }).solve(turnstileConfig);
    expect(token).toBe("token-asli");
    expect(render.mock.calls[0]?.[1]).toMatchObject({
      sitekey: turnstileConfig.siteKey,
      appearance: "interaction-only",
    });
    expect(remove).toHaveBeenCalledWith("widget-1");
    expect(document.body.children).toHaveLength(0);
  });

  it("galat atau timeout dari widget menjadi CAPTCHA_FAILED dan widget tetap dibersihkan", async () => {
    const { remove } = fakeTurnstile((options) => options["error-callback"]());
    await expect(
      createTurnstileCaptchaService({ appConfig: config(false) }).solve(turnstileConfig),
    ).rejects.toMatchObject({ error: { code: "CAPTCHA_FAILED" } });
    expect(remove).toHaveBeenCalledWith("widget-1");
    expect(document.body.children).toHaveLength(0);
  });
});
