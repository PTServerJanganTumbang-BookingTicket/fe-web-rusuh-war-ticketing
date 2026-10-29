import type { RandomProtocol } from "@/core/domain/random.protocol";

export class MathRandomService implements RandomProtocol {
  next(): number {
    return Math.random();
  }
}
