import { describe, expect, it } from "vitest";
import { createStartSessionUseCase } from "../start-session.use-case";

describe("createStartSessionUseCase", () => {
  it("menitipkan access token lewat SessionProtocol", async () => {
    const started: string[] = [];
    const startSessionUseCase = createStartSessionUseCase({
      sessionService: { start: async (token) => void started.push(token) },
    });
    await startSessionUseCase("tok-1");
    expect(started).toEqual(["tok-1"]);
  });
});
