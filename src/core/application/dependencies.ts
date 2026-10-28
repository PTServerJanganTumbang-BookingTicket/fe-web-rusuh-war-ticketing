import type { AppConfig } from "./AppConfig";
import type { Clock } from "./Clock";
import type { RandomSource } from "./RandomSource";
import type { StartSession } from "./session/StartSession";

/** Irisan container yang boleh dipakai presentation lintas modul (ISP: hanya yang dibutuhkan). */
export type CoreDependencies = {
  appConfig: AppConfig;
  clock: Clock;
  random: RandomSource;
  startSession: StartSession;
};
