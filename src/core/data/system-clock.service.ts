import type { ClockProtocol } from "@/core/domain/clock.protocol";

export class SystemClockService implements ClockProtocol {
  now(): number {
    return Date.now();
  }
}
