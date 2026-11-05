import { z } from "zod";
import type { AppConfig } from "@/core/domain/app-config.model";
import { AppFailure, parseApiErrorCode } from "@/core/domain/app-error";
import type { HttpClient, RequestOptions } from "./http.client";

/** Pembungkus semua response kontrak. `data` tidak ada pada sebagian response sukses (mis. POST /auth/magic-link). */
const envelopeSchema = z.object({
  meta: z.object({ code: z.number(), message: z.string() }),
  data: z.unknown().optional(),
});

export type FetchFn = typeof fetch;

async function request<T>(
  fetchFn: FetchFn,
  url: string,
  schema: z.ZodType<T>,
  init: RequestInit,
  options: RequestOptions = {},
): Promise<T> {
  let response: Response;
  try {
    // `include`: cookie `queue_token` milik host API harus ikut (kontrak, QueueTokenCookie).
    response = await fetchFn(url, {
      ...init,
      credentials: "include",
      headers: { ...init.headers, ...options.headers },
    });
  } catch {
    throw new AppFailure({ kind: "network" });
  }

  const envelope = envelopeSchema.safeParse(await response.json().catch(() => undefined));
  if (response.status === 204) return schema.parse(undefined);

  if (!response.ok) {
    const code = options.errorCodes?.[response.status] ?? parseApiErrorCode(envelope.data?.meta.message);
    throw new AppFailure(
      code ? { kind: "api", code, status: response.status } : { kind: "unknown", status: response.status },
    );
  }

  if (!envelope.success) throw new AppFailure({ kind: "invalid_response" });
  const parsed = schema.safeParse(envelope.data.data);
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
    get: (path, schema, options) =>
      request(fetchFn, `${appConfig.apiBaseUrl}${path}`, schema, { method: "GET" }, options),
    post: (path, body, schema, options) =>
      request(
        fetchFn,
        `${appConfig.apiBaseUrl}${path}`,
        schema,
        { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) },
        options,
      ),
    patch: (path, body, schema, options) =>
      request(
        fetchFn,
        `${appConfig.apiBaseUrl}${path}`,
        schema,
        { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) },
        options,
      ),
    delete: async (path, options) => {
      await request(fetchFn, `${appConfig.apiBaseUrl}${path}`, z.unknown(), { method: "DELETE" }, options);
    },
  };
}
