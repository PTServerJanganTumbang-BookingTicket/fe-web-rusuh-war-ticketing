import { z } from "zod";
import { AppFailure, parseApiErrorCode } from "@rusuh/core";

const errorBody = z.object({ code: z.string() });

export function getApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://api.rusuh.test";
}

/** Satu-satunya pintu HTTP. Semua kegagalan dipetakan ke AppFailure, semua sukses diparse zod. */
export async function apiFetch<T>(path: string, schema: z.ZodType<T>, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${getApiBaseUrl()}${path}`, init);
  } catch {
    throw new AppFailure({ kind: "network" });
  }

  const body: unknown = await response.json().catch(() => undefined);

  if (!response.ok) {
    const code = parseApiErrorCode(errorBody.safeParse(body).data?.code);
    throw new AppFailure(
      code
        ? { kind: "api", code, status: response.status }
        : { kind: "unknown", status: response.status },
    );
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) throw new AppFailure({ kind: "invalid_response" });
  return parsed.data;
}
