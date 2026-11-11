import { describe, expect, it } from "vitest";
import { createEndSessionUseCase } from "../end-session.use-case";
import { createStartSessionUseCase } from "../start-session.use-case";

describe("createStartSessionUseCase", () => {
  it("menitipkan access token lewat SessionProtocol", async () => {
    const started: string[] = [];
    const startSessionUseCase = createStartSessionUseCase({
      sessionService: { start: async (token) => void started.push(token), end: async () => {} },
    });
    await startSessionUseCase("tok-1");
    expect(started).toEqual(["tok-1"]);
  });

  it("endSessionUseCase melepas grant lewat SessionProtocol", async () => {
    let ended = 0;
    const endSessionUseCase = createEndSessionUseCase({
      sessionService: { start: async () => {}, end: async () => void (ended += 1) },
    });
    await endSessionUseCase();
    expect(ended).toBe(1);
  });
});
