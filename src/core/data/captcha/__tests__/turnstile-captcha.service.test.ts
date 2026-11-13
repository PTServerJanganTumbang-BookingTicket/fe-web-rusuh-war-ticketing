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
  "before-interactive-callback": () => void;
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

  it("timeout-callback dari widget menjadi CAPTCHA_FAILED", async () => {
    fakeTurnstile((options) => options["timeout-callback"]());
    await expect(
      createTurnstileCaptchaService({ appConfig: config(false) }).solve(turnstileConfig),
    ).rejects.toMatchObject({ error: { code: "CAPTCHA_FAILED" } });
  });

  it("widget yang tidak menjawab dalam 15 detik gagal sebagai CAPTCHA_FAILED", async () => {
    vi.useFakeTimers();
    try {
      fakeTurnstile(() => undefined);
      const result = createTurnstileCaptchaService({ appConfig: config(false) }).solve(turnstileConfig);
      const assertion = expect(result).rejects.toMatchObject({ error: { code: "CAPTCHA_FAILED" } });
      await vi.advanceTimersByTimeAsync(15_000);
      await assertion;
    } finally {
      vi.useRealTimers();
    }
  });

  describe("memuat skrip Turnstile", () => {
    const scriptTag = () => document.head.querySelector<HTMLScriptElement>("script[src*=turnstile]");

    it("gagal memuat (jaringan) menjadi CAPTCHA_FAILED dan boleh dicoba lagi", async () => {
      const service = createTurnstileCaptchaService({ appConfig: config(false) });
      const first = service.solve(turnstileConfig);
      scriptTag()!.onerror?.(new Event("error"));
      await expect(first).rejects.toMatchObject({ error: { code: "CAPTCHA_FAILED" } });
      scriptTag()!.remove();

      // Panggilan berikutnya memuat ulang skrip, bukan memakai kegagalan yang tersimpan.
      fakeTurnstile((options) => options.callback("token-2"));
      expect(await service.solve(turnstileConfig)).toBe("token-2");
    });

    it("skrip termuat tetapi API turnstile tidak ada: CAPTCHA_FAILED", async () => {
      const first = createTurnstileCaptchaService({ appConfig: config(false) }).solve(turnstileConfig);
      scriptTag()!.onload?.(new Event("load"));
      await expect(first).rejects.toMatchObject({ error: { code: "CAPTCHA_FAILED" } });
      scriptTag()!.remove();
    });

    it("skrip termuat dan API tersedia: widget dipasang", async () => {
      const first = createTurnstileCaptchaService({ appConfig: config(false) }).solve(turnstileConfig);
      fakeTurnstile((options) => options.callback("token-3"));
      scriptTag()!.onload?.(new Event("load"));
      expect(await first).toBe("token-3");
    });
  });

  describe("warm", () => {
    it("memuat skrip tanpa memasang widget, dan hanya sekali", () => {
      const service = createTurnstileCaptchaService({ appConfig: config(false) });
      service.warm();
      service.warm();
      expect(document.head.querySelectorAll("script[src*=turnstile]")).toHaveLength(1);
      document.head.querySelector("script[src*=turnstile]")!.remove();
    });

    it("mode mock tidak memuat skrip", () => {
      createTurnstileCaptchaService({ appConfig: config(true) }).warm();
      expect(document.querySelector("script")).toBeNull();
    });
  });

  describe("presolve", () => {
    afterEach(() => vi.useRealTimers());

    it("token yang sudah diselesaikan dipakai solve berikutnya tanpa memasang widget lagi, dan hanya sekali", async () => {
      let issued = 0;
      const { render } = fakeTurnstile((options) => options.callback(`token-${(issued += 1)}`));
      const service = createTurnstileCaptchaService({ appConfig: config(false) });
      service.presolve("evt-1", turnstileConfig);
      service.presolve("evt-1", turnstileConfig);
      expect(await service.solve(turnstileConfig, "evt-1")).toBe("token-1");
      expect(render).toHaveBeenCalledTimes(1);
      // Sekali pakai: join berikutnya meminta token baru.
      expect(await service.solve(turnstileConfig, "evt-1")).toBe("token-2");
      expect(render).toHaveBeenCalledTimes(2);
    });

    it("scope lain tidak memakai token event ini", async () => {
      let issued = 0;
      fakeTurnstile((options) => options.callback(`token-${(issued += 1)}`));
      const service = createTurnstileCaptchaService({ appConfig: config(false) });
      service.presolve("evt-1", turnstileConfig);
      expect(await service.solve(turnstileConfig, "evt-2")).toBe("token-2");
    });

    it("site key yang berbeda membuang token siap pakai", async () => {
      let issued = 0;
      fakeTurnstile((options) => options.callback(`token-${(issued += 1)}`));
      const service = createTurnstileCaptchaService({ appConfig: config(false) });
      service.presolve("evt-1", turnstileConfig);
      expect(await service.solve({ ...turnstileConfig, siteKey: "lain" }, "evt-1")).toBe("token-2");
    });

    it("token yang kedaluwarsa tidak dipakai", async () => {
      vi.useFakeTimers();
      let issued = 0;
      fakeTurnstile((options) => options.callback(`token-${(issued += 1)}`));
      const service = createTurnstileCaptchaService({ appConfig: config(false) });
      service.presolve("evt-1", turnstileConfig);
      await vi.advanceTimersByTimeAsync(240_001);
      expect(await service.solve(turnstileConfig, "evt-1")).toBe("token-2");
    });

    it("gagal di latar: solve mengulang sendiri, tanpa galat tak tertangani", async () => {
      let attempt = 0;
      fakeTurnstile((options) => {
        attempt += 1;
        if (attempt === 1) options["error-callback"]();
        else options.callback("token-ulang");
      });
      const service = createTurnstileCaptchaService({ appConfig: config(false) });
      service.presolve("evt-1", turnstileConfig);
      expect(await service.solve(turnstileConfig, "evt-1")).toBe("token-ulang");
    });

    it("gagal di latar lalu presolve lagi memulai percobaan baru", async () => {
      let attempt = 0;
      const { render } = fakeTurnstile((options) => {
        attempt += 1;
        if (attempt === 1) options["error-callback"]();
        else options.callback("token-baru");
      });
      const service = createTurnstileCaptchaService({ appConfig: config(false) });
      service.presolve("evt-1", turnstileConfig);
      await vi.waitFor(() => expect(render).toHaveBeenCalledTimes(1));
      await new Promise((resolve) => setTimeout(resolve, 0));
      service.presolve("evt-1", turnstileConfig);
      expect(await service.solve(turnstileConfig, "evt-1")).toBe("token-baru");
      expect(render).toHaveBeenCalledTimes(2);
    });

    it("tanpa konfigurasi, mode mock, atau provider lain: tidak ada yang diselesaikan", () => {
      const { render } = fakeTurnstile(() => undefined);
      createTurnstileCaptchaService({ appConfig: config(false) }).presolve("evt-1", null);
      createTurnstileCaptchaService({ appConfig: config(true) }).presolve("evt-1", turnstileConfig);
      createTurnstileCaptchaService({ appConfig: config(false) }).presolve("evt-1", {
        provider: "lain",
        siteKey: "k",
      });
      expect(render).not.toHaveBeenCalled();
    });
  });

  describe("status dan tantangan interaktif", () => {
    afterEach(() => vi.useRealTimers());

    it("solve melaporkan checking selama berjalan lalu kembali idle, dan memberi tahu pelanggan", async () => {
      let finish: (token: string) => void = () => undefined;
      fakeTurnstile((options) => (finish = options.callback));
      const service = createTurnstileCaptchaService({ appConfig: config(false) });
      const seen: string[] = [];
      const unsubscribe = service.subscribe(() => seen.push(service.status()));
      expect(service.status()).toBe("idle");

      const token = service.solve(turnstileConfig);
      expect(service.status()).toBe("checking");
      await vi.waitFor(() => expect(document.body.children).toHaveLength(1));
      finish("token-ok");
      expect(await token).toBe("token-ok");
      expect(service.status()).toBe("idle");
      expect(seen).toEqual(["checking", "idle"]);

      unsubscribe();
      service.presolve("evt-x", turnstileConfig);
      expect(seen).toEqual(["checking", "idle"]);
    });

    it("tantangan interaktif saat solve: widget ditampilkan, status interactive, batas waktu diperpanjang", async () => {
      vi.useFakeTimers();
      let options: Options | undefined;
      const { remove } = fakeTurnstile((rendered) => {
        options = rendered;
        rendered["before-interactive-callback"]();
      });
      const service = createTurnstileCaptchaService({ appConfig: config(false) });
      const token = service.solve(turnstileConfig);
      await vi.advanceTimersByTimeAsync(0);

      const container = document.body.firstElementChild as HTMLElement;
      expect(service.status()).toBe("interactive");
      expect(container.getAttribute("aria-hidden")).toBeNull();
      expect(container.style.position).toBe("fixed");
      expect(container.style.width).toBe("");

      // Melewati batas pemeriksaan tak terlihat (15 detik) tidak menggagalkan tantangan yang sedang dikerjakan.
      await vi.advanceTimersByTimeAsync(30_000);
      options!.callback("token-manusia");
      expect(await token).toBe("token-manusia");
      expect(service.status()).toBe("idle");
      expect(remove).toHaveBeenCalledWith("widget-1");
      expect(document.body.children).toHaveLength(0);
    });

    it("tantangan interaktif yang tidak diselesaikan gagal setelah 2 menit", async () => {
      vi.useFakeTimers();
      fakeTurnstile((rendered) => rendered["before-interactive-callback"]());
      const service = createTurnstileCaptchaService({ appConfig: config(false) });
      const result = service.solve(turnstileConfig);
      const assertion = expect(result).rejects.toMatchObject({ error: { code: "CAPTCHA_FAILED" } });
      await vi.advanceTimersByTimeAsync(120_000);
      await assertion;
      expect(service.status()).toBe("idle");
    });

    it("presolve tidak menampilkan tantangan; solve berikutnya mengulangnya dan menampilkannya", async () => {
      let renders = 0;
      fakeTurnstile((rendered) => {
        renders += 1;
        if (renders === 1) {
          rendered["before-interactive-callback"]();
          return;
        }
        rendered.callback("token-di-ruang-tunggu");
      });
      const service = createTurnstileCaptchaService({ appConfig: config(false) });
      const seen: string[] = [];
      service.subscribe(() => seen.push(service.status()));

      service.presolve("evt-i", turnstileConfig);
      await vi.waitFor(() => expect(renders).toBe(1));
      expect(seen).toEqual([]);

      expect(await service.solve(turnstileConfig, "evt-i")).toBe("token-di-ruang-tunggu");
      expect(renders).toBe(2);
      expect(seen).toEqual(["checking", "idle"]);
    });
  });
});
