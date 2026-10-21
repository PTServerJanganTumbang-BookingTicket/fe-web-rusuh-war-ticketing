import { AppFailure } from "@rusuh/core";

/** Menitipkan access token ke cookie httpOnly lewat route handler same-origin. */
export async function startSession(accessToken: string): Promise<void> {
  let response: Response;
  try {
    response = await fetch("/api/session/start", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ accessToken }),
    });
  } catch {
    throw new AppFailure({ kind: "network" });
  }
  if (!response.ok) throw new AppFailure({ kind: "unknown", status: response.status });
}
