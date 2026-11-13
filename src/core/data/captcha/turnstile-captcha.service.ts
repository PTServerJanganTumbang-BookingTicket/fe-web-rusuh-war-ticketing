import type { AppConfig } from "@/core/domain/app-config.model";
import { AppFailure } from "@/core/domain/app-error";
import type { CaptchaConfig, CaptchaProtocol } from "@/core/domain/captcha.protocol";

const SCRIPT_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
const SOLVE_TIMEOUT_MS = 15_000;
/** Token Turnstile berlaku 300 detik dan sekali pakai; token siap pakai dibuang sebelum itu. */
const PRESOLVED_TTL_MS = 240_000;

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

  const presolved = new Map<string, { siteKey: string; token: Promise<string>; expiresAt: number }>();

  const isFresh = (entry: { expiresAt: number }) => entry.expiresAt > Date.now();

  /** Token siap pakai milik `scope` bila masih segar dan untuk site key yang sama; entri selalu dikeluarkan. */
  function takePresolved(scope: string, config: CaptchaConfig): Promise<string> | undefined {
    const entry = presolved.get(scope);
    presolved.delete(scope);
    return entry && isFresh(entry) && entry.siteKey === config.siteKey ? entry.token : undefined;
  }

  return {
    async solve(config, scope) {
      if (!config) return "";
      if (appConfig.mocking) return MOCK_CAPTCHA_TOKEN;
      if (config.provider !== "turnstile") throw failed();
      const ready = scope === undefined ? undefined : takePresolved(scope, config);
      if (ready) {
        try {
          return await ready;
        } catch {
          // Penyelesaian di latar gagal: ulangi di sini supaya galatnya tampil sebagai hasil join.
        }
      }
      return solveTurnstile(config);
    },

    warm() {
      if (appConfig.mocking || typeof window === "undefined") return;
      loadTurnstile().catch(() => undefined);
    },

    presolve(scope, config) {
      if (!config || appConfig.mocking || typeof window === "undefined") return;
      if (config.provider !== "turnstile") return;
      const current = presolved.get(scope);
      if (current && isFresh(current) && current.siteKey === config.siteKey) return;
      const token = solveTurnstile(config);
      const entry = { siteKey: config.siteKey, token, expiresAt: Date.now() + PRESOLVED_TTL_MS };
      presolved.set(scope, entry);
      // Gagal di latar tidak boleh jadi galat tak tertangani; entri gagal dibuang agar percobaan berikutnya mulai ulang.
      token.catch(() => {
        if (presolved.get(scope) === entry) presolved.delete(scope);
      });
    },
  };
}
