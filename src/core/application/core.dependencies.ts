import type { AppConfig } from "@/core/domain/app-config.model";
import type { ClockProtocol } from "@/core/domain/clock.protocol";
import type { RandomProtocol } from "@/core/domain/random.protocol";
import type { StartSessionUseCase } from "./start-session.use-case";

/** Irisan container yang boleh dipakai controller lintas modul (ISP: hanya yang dibutuhkan). */
export type CoreDependencies = {
  appConfig: AppConfig;
  clock: ClockProtocol;
  random: RandomProtocol;
  startSessionUseCase: StartSessionUseCase;
};
