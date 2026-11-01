import type { ClockProtocol } from "@/core/domain/clock.protocol";

export function createSystemClockService(): ClockProtocol {
  return {
    now(): number {
      return Date.now();
    },
  };
}
