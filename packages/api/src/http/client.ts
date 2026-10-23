import { z } from "zod";
import { AppFailure, parseApiErrorCode } from "@rusuh/core";

const errorBody = z.object({ code: z.string() });

export function getApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://api.rusuh.test";
}

/** Retry-After dalam detik (bentuk tanggal HTTP tidak dipakai BE). */
function retryAfterMs(response: Response): number | undefined {
  const seconds = Number(response.headers.get("retry-after"));
  return Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : undefined;
}

/** Response tanpa isi (204), mis. menukar link login atau logout. */
export const noContent = z.unknown().transform((): void => undefined);

/** Satu-satunya pintu HTTP. Semua kegagalan dipetakan ke AppFailure, semua sukses diparse zod. */
export async function apiFetch<T>(path: string, schema: z.ZodType<T, unknown>, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    // KONTRAK-ASUMSI: sesi login adalah cookie httpOnly milik BE, jadi setiap request membawa cookie (CORS dengan credentials).
    response = await fetch(`${getApiBaseUrl()}${path}`, { credentials: "include", ...init });
  } catch {
    throw new AppFailure({ kind: "network" });
  }

  const body: unknown = await response.json().catch(() => undefined);

  if (!response.ok) {
    const code = parseApiErrorCode(errorBody.safeParse(body).data?.code);
    const retryAfter = retryAfterMs(response);
    throw new AppFailure(
      code
        ? { kind: "api", code, status: response.status, ...(retryAfter && { retryAfterMs: retryAfter }) }
        : { kind: "unknown", status: response.status },
    );
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) throw new AppFailure({ kind: "invalid_response" });
  return parsed.data;
}
