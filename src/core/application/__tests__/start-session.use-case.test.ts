import { describe, expect, it } from "vitest";
import type { SessionProtocol } from "@/core/domain/session.protocol";
import { createEndSessionUseCase } from "../end-session.use-case";
import { createResetSessionUseCase } from "../reset-session.use-case";
import { createStartSessionUseCase } from "../start-session.use-case";

function fakeSession() {
  const calls: unknown[][] = [];
  const sessionService: SessionProtocol = {
    start: async (...args) => void calls.push(["start", ...args]),
    end: async (...args: unknown[]) => void calls.push(["end", ...args]),
    reset: async (...args: unknown[]) => void calls.push(["reset", ...args]),
  };
  return { calls, sessionService };
}

describe("use case sesi", () => {
  it("startSessionUseCase menitipkan grant bersama event pemiliknya", async () => {
    const { calls, sessionService } = fakeSession();
    await createStartSessionUseCase({ sessionService })("evt_a", "tok-1");
    expect(calls).toEqual([["start", "evt_a", "tok-1"]]);
  });

  it("endSessionUseCase melepas grant dan tidak meneruskan argumen pemanggil (useMutation)", async () => {
    const { calls, sessionService } = fakeSession();
    const endSessionUseCase = createEndSessionUseCase({ sessionService }) as (
      ...args: unknown[]
    ) => Promise<void>;
    await endSessionUseCase(undefined, { client: {} });
    expect(calls).toEqual([["end"]]);
  });

  it("resetSessionUseCase membuang grant dan token antrian lewat SessionProtocol.reset", async () => {
    const { calls, sessionService } = fakeSession();
    await createResetSessionUseCase({ sessionService })();
    expect(calls).toEqual([["reset"]]);
  });
});
