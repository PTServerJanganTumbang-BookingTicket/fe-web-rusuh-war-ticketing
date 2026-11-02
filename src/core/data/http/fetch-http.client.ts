import { z } from "zod";
import type { AppConfig } from "@/core/domain/app-config.model";
import { AppFailure, parseApiErrorCode } from "@/core/domain/app-error";
import type { HttpClient } from "./http.client";

const errorBody = z.object({ code: z.string() });

export type FetchFn = typeof fetch;

async function request<T>(
  fetchFn: FetchFn,
  baseUrl: string,
  path: string,
  schema: z.ZodType<T>,
  init?: RequestInit,
): Promise<T> {
  let response: Response;
  try {
    response = await fetchFn(`${baseUrl}${path}`, init);
  } catch {
    throw new AppFailure({ kind: "network" });
  }

  const body: unknown = await response.json().catch(() => undefined);

  if (!response.ok) {
    const code = parseApiErrorCode(errorBody.safeParse(body).data?.code);
    throw new AppFailure(
      code ? { kind: "api", code, status: response.status } : { kind: "unknown", status: response.status },
    );
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) throw new AppFailure({ kind: "invalid_response" });
  return parsed.data;
}

/** Satu-satunya pintu HTTP ke backend. Semua kegagalan dipetakan ke AppFailure, semua sukses diparse zod. */
export function createFetchHttpClient({
  appConfig,
  fetchFn,
}: {
  appConfig: AppConfig;
  fetchFn: FetchFn;
}): HttpClient {
  return {
    get: (path, schema) => request(fetchFn, appConfig.apiBaseUrl, path, schema),
    post: (path, body, schema) =>
      request(fetchFn, appConfig.apiBaseUrl, path, schema, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      }),
  };
}
