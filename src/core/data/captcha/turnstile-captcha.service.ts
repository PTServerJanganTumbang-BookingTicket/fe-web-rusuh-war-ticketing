import type { AppConfig } from "@/core/domain/app-config.model";
import { AppFailure } from "@/core/domain/app-error";
import type { CaptchaConfig, CaptchaProtocol } from "@/core/domain/captcha.protocol";

const SCRIPT_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
const SOLVE_TIMEOUT_MS = 15_000;

/** Token yang diterima handler MSW; mode mock tidak memuat skrip pihak ketiga. */
export const MOCK_CAPTCHA_TOKEN = "mock-captcha-token";

type TurnstileApi = {
  render(
    container: HTMLElement,
    options: {
      sitekey: string;
      appearance: "interaction-only";
      callback: (token: string) => void;
      "error-callback": () => void;
      "timeout-callback": () => void;
    },
  ): string;
  remove(widgetId: string): void;
};

type TurnstileWindow = Window & { turnstile?: TurnstileApi };

const failed = () => new AppFailure({ kind: "api", code: "CAPTCHA_FAILED", status: 403 });

let loading: Promise<TurnstileApi> | undefined;

function loadTurnstile(): Promise<TurnstileApi> {
  const existing = (window as TurnstileWindow).turnstile;
  if (existing) return Promise.resolve(existing);
  loading ??= new Promise<TurnstileApi>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_URL;
    script.async = true;
    script.onload = () => {
      const api = (window as TurnstileWindow).turnstile;
      if (api) resolve(api);
      else reject(failed());
    };
    script.onerror = () => reject(failed());
    document.head.append(script);
  }).catch((error: unknown) => {
    // Gagal memuat boleh dicoba lagi pada panggilan berikutnya.
    loading = undefined;
    throw error;
  });
  return loading;
}

/** Cloudflare Turnstile dalam mode tak terlihat: widget dipasang di elemen tersembunyi lalu dilepas. */
export function createTurnstileCaptchaService({ appConfig }: { appConfig: AppConfig }): CaptchaProtocol {
  async function solveTurnstile(config: CaptchaConfig): Promise<string> {
    const turnstile = await loadTurnstile();
    const container = document.createElement("div");
    container.setAttribute("aria-hidden", "true");
    container.style.cssText = "position:fixed;bottom:0;right:0;width:0;height:0;overflow:hidden";
    document.body.append(container);
    let widgetId: string | undefined;
    try {
      return await new Promise<string>((resolve, reject) => {
        const timer = setTimeout(() => reject(failed()), SOLVE_TIMEOUT_MS);
        const settle = (finish: () => void) => {
          clearTimeout(timer);
          finish();
        };
        widgetId = turnstile.render(container, {
          sitekey: config.siteKey,
          appearance: "interaction-only",
          callback: (token) => settle(() => resolve(token)),
          "error-callback": () => settle(() => reject(failed())),
          "timeout-callback": () => settle(() => reject(failed())),
        });
      });
    } finally {
      if (widgetId !== undefined) turnstile.remove(widgetId);
      container.remove();
    }
  }

  return {
    async solve(config) {
      if (!config) return "";
      if (appConfig.mocking) return MOCK_CAPTCHA_TOKEN;
      if (config.provider !== "turnstile") throw failed();
      return solveTurnstile(config);
    },
  };
}
