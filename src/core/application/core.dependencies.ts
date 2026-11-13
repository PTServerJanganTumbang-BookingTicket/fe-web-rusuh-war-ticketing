import type { AppConfig } from "@/core/domain/app-config.model";
import type { CaptchaProtocol } from "@/core/domain/captcha.protocol";
import type { ClockProtocol } from "@/core/domain/clock.protocol";
import type { LocalePreferenceProtocol } from "@/core/domain/locale-preference.protocol";
import type { RandomProtocol } from "@/core/domain/random.protocol";
import type { StartSessionUseCase } from "./start-session.use-case";
import type { EndSessionUseCase } from "./end-session.use-case";
import type { ResetSessionUseCase } from "./reset-session.use-case";
import type { GetSessionAccountUseCase } from "./get-session-account.use-case";

/** Irisan container yang boleh dipakai controller lintas modul (ISP: hanya yang dibutuhkan). */
export type CoreDependencies = {
  appConfig: AppConfig;
  clock: ClockProtocol;
  random: RandomProtocol;
  /** Dipakai halaman yang mengarah ke antrian untuk menyiapkan CAPTCHA lebih awal. */
  captcha: CaptchaProtocol;
  /** Bahasa pilihan customer di perangkat ini (i18n). */
  localePreference: LocalePreferenceProtocol;
  startSessionUseCase: StartSessionUseCase;
  endSessionUseCase: EndSessionUseCase;
  /** Dipanggil setelah keluar akun: grant dan token antrian identitas sebelumnya dibuang. */
  resetSessionUseCase: ResetSessionUseCase;
  getSessionAccountUseCase: GetSessionAccountUseCase;
};
