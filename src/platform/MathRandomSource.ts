import type { RandomSource } from "@/core/application/RandomSource";

export class MathRandomSource implements RandomSource {
  next(): number {
    return Math.random();
  }
}
