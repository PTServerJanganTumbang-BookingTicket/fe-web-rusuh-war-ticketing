import { describe, expect, it } from "vitest";
import { StartSessionUseCase } from "../start-session.use-case";

describe("StartSessionUseCase", () => {
  it("menitipkan access token lewat SessionProtocol", async () => {
    const started: string[] = [];
    const startSessionUseCase = new StartSessionUseCase({
      sessionService: { start: async (token) => void started.push(token) },
    });
    await startSessionUseCase.execute("tok-1");
    expect(started).toEqual(["tok-1"]);
  });
});
