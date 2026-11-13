import type { AppConfig } from "@/core/domain/app-config.model";
import { AppFailure } from "@/core/domain/app-error";
import type { CaptchaConfig, CaptchaProtocol, CaptchaStatus } from "@/core/domain/captcha.protocol";

const SCRIPT_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
const SOLVE_TIMEOUT_MS = 15_000;
/** Tantangan interaktif menunggu customer, jadi batasnya lebih longgar daripada pemeriksaan tak terlihat. */
const INTERACTIVE_TIMEOUT_MS = 120_000;
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
      "before-interactive-callback": () => void;
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

const HIDDEN_STYLE = "position:fixed;bottom:0;right:0;width:0;height:0;overflow:hidden";
/** Widget tantangan di tengah bawah layar, di atas konten halaman. */
const VISIBLE_STYLE = "position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:60";

/**
 * Cloudflare Turnstile mode `interaction-only`: widget dipasang di elemen tersembunyi lalu dilepas. Bila Cloudflare
 * meminta interaksi, widget ditampilkan (hanya untuk `solve`) supaya customer bisa menyelesaikannya; tanpa itu
 * tantangan tidak pernah terlihat dan selalu berakhir timeout.
 */
export function createTurnstileCaptchaService({ appConfig }: { appConfig: AppConfig }): CaptchaProtocol {
  let solving = 0;
  let interacting = 0;
  let current: CaptchaStatus = "idle";
  const listeners = new Set<() => void>();

  function nextStatus(): CaptchaStatus {
    if (interacting > 0) return "interactive";
    return solving > 0 ? "checking" : "idle";
  }

  function publish() {
    const next = nextStatus();
    if (next === current) return;
    current = next;
    for (const listener of listeners) listener();
  }

  async function solveTurnstile(
    config: CaptchaConfig,
    { interactive }: { interactive: boolean },
  ): Promise<string> {
    const turnstile = await loadTurnstile();
    const container = document.createElement("div");
    container.setAttribute("aria-hidden", "true");
    container.style.cssText = HIDDEN_STYLE;
    document.body.append(container);
    let widgetId: string | undefined;
    let shown = false;
    try {
      return await new Promise<string>((resolve, reject) => {
        let timer = setTimeout(() => reject(failed()), SOLVE_TIMEOUT_MS);
        const settle = (finish: () => void) => {
          clearTimeout(timer);
          finish();
        };
        const showChallenge = () => {
          // Di latar (presolve) tantangan tidak ditampilkan: `solve` di ruang tunggu mengulangnya.
          if (!interactive) return settle(() => reject(failed()));
          if (shown) return;
          shown = true;
          container.removeAttribute("aria-hidden");
          container.style.cssText = VISIBLE_STYLE;
          clearTimeout(timer);
          timer = setTimeout(() => reject(failed()), INTERACTIVE_TIMEOUT_MS);
          interacting += 1;
          publish();
        };
        widgetId = turnstile.render(container, {
          sitekey: config.siteKey,
          appearance: "interaction-only",
          callback: (token) => settle(() => resolve(token)),
          "error-callback": () => settle(() => reject(failed())),
          "timeout-callback": () => settle(() => reject(failed())),
          "before-interactive-callback": showChallenge,
        });
      });
    } finally {
      if (widgetId !== undefined) turnstile.remove(widgetId);
      container.remove();
      if (shown) {
        interacting -= 1;
        publish();
      }
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
      solving += 1;
      publish();
      try {
        const ready = scope === undefined ? undefined : takePresolved(scope, config);
        if (ready) {
          try {
            return await ready;
          } catch {
            // Penyelesaian di latar gagal: ulangi di sini supaya galatnya tampil sebagai hasil join.
          }
        }
        return await solveTurnstile(config, { interactive: true });
      } finally {
        solving -= 1;
        publish();
      }
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
      const token = solveTurnstile(config, { interactive: false });
      const entry = { siteKey: config.siteKey, token, expiresAt: Date.now() + PRESOLVED_TTL_MS };
      presolved.set(scope, entry);
      // Gagal di latar tidak boleh jadi galat tak tertangani; entri gagal dibuang agar percobaan berikutnya mulai ulang.
      token.catch(() => {
        if (presolved.get(scope) === entry) presolved.delete(scope);
      });
    },

    status: () => current,

    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
