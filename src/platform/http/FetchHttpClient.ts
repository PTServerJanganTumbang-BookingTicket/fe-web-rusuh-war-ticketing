import { z } from "zod";
import type { AppConfig } from "@/core/application/AppConfig";
import { AppFailure, parseApiErrorCode } from "@/core/domain/errors/appError";
import type { HttpClient } from "./HttpClient";

const errorBody = z.object({ code: z.string() });

export type FetchFn = typeof fetch;

/** Satu-satunya pintu HTTP ke backend. Semua kegagalan dipetakan ke AppFailure, semua sukses diparse zod. */
export class FetchHttpClient implements HttpClient {
  private readonly appConfig: AppConfig;
  private readonly fetchFn: FetchFn;

  constructor({ appConfig, fetchFn }: { appConfig: AppConfig; fetchFn: FetchFn }) {
    this.appConfig = appConfig;
    this.fetchFn = fetchFn;
  }

  get<T>(path: string, schema: z.ZodType<T>): Promise<T> {
    return this.request(path, schema);
  }

  post<T>(path: string, body: unknown, schema: z.ZodType<T>): Promise<T> {
    return this.request(path, schema, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  private async request<T>(path: string, schema: z.ZodType<T>, init?: RequestInit): Promise<T> {
    let response: Response;
    try {
      response = await this.fetchFn(`${this.appConfig.apiBaseUrl}${path}`, init);
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
}
