import type { Clock } from "@/core/application/Clock";

export class SystemClock implements Clock {
  now(): number {
    return Date.now();
  }
}
