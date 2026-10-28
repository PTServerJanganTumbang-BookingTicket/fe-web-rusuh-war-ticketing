import { describe, expect, it } from "vitest";
import { StartSession } from "./StartSession";

describe("StartSession", () => {
  it("menitipkan access token lewat gateway", async () => {
    const started: string[] = [];
    const startSession = new StartSession({
      sessionGateway: { start: async (token) => void started.push(token) },
    });
    await startSession.execute("tok-1");
    expect(started).toEqual(["tok-1"]);
  });
});
