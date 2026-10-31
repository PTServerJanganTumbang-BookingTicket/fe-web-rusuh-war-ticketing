import type { RandomProtocol } from "@/core/domain/random.protocol";

export function createMathRandomService(): RandomProtocol {
  return {
    next(): number {
      return Math.random();
    },
  };
}
