import { HttpResponse } from "msw";

// Semua response kontrak memakai `{ meta, data }` dengan field snake_case (openapi.json).
export type Pagination = { totalData: number; totalPage: number; limit: number; offset: number };

type Meta = { code: number; message: string; server_time: string; pagination?: Pagination };

/** `meta.server_time` ada di setiap response kontrak. */
const serverTime = () => new Date().toISOString();

/** `meta.error_code` bawaan per status bila handler tidak menyebut kode spesifik (kontrak §Error). */
const DEFAULT_ERROR_CODES: Record<number, string> = {
  400: "VALIDATION_ERROR",
  401: "UNAUTHORIZED",
  403: "FORBIDDEN",
  404: "NOT_FOUND",
  409: "CONFLICT",
  410: "GONE",
  422: "UNPROCESSABLE_ENTITY",
  429: "TOO_MANY_REQUESTS",
  503: "SERVICE_UNAVAILABLE",
};

export function ok(
  data: unknown,
  {
    status = 200,
    message = "Success",
    pagination,
  }: { status?: number; message?: string; pagination?: Pagination } = {},
) {
  const meta: Meta = {
    code: status,
    message,
    server_time: serverTime(),
    ...(pagination ? { pagination } : {}),
  };
  return HttpResponse.json({ meta, data }, { status });
}

/** Response tanpa `data`, misalnya POST /auth/magic-link. */
export function okMeta(message: string) {
  return HttpResponse.json({ meta: { code: 200, message, server_time: serverTime() }, data: {} });
}

export function fail(
  status: number,
  message: string,
  data: unknown = {},
  errorCode: string = DEFAULT_ERROR_CODES[status] ?? "ERROR",
) {
  const meta = { code: status, message, error_code: errorCode, server_time: serverTime() };
  return HttpResponse.json({ meta, data }, { status });
}

export function noContent() {
  return new HttpResponse(null, { status: 204 });
}

export function paginate<T>(items: T[], url: URL, defaultLimit = 10) {
  const limit = Math.min(Number(url.searchParams.get("limit") ?? defaultLimit) || defaultLimit, 50);
  const offset = Math.max(Number(url.searchParams.get("offset") ?? 0) || 0, 0);
  const pagination: Pagination = {
    totalData: items.length,
    totalPage: Math.max(Math.ceil(items.length / limit), 1),
    limit,
    offset,
  };
  return { page: items.slice(offset, offset + limit), pagination };
}

/** Body JSON yang tidak bisa dibaca dianggap kosong; validasi field dilakukan handler. */
export async function readJson(request: Request): Promise<unknown> {
  return request.json().catch(() => undefined);
}

/** Membaca satu field dari body yang belum divalidasi. */
export const field = (body: unknown, key: string): unknown =>
  typeof body === "object" && body !== null ? (body as Record<string, unknown>)[key] : undefined;

export function hasBearer(request: Request) {
  return /^Bearer \S+$/.test(request.headers.get("authorization") ?? "");
}

export function iso(ms: number) {
  return new Date(ms).toISOString();
}

export function ttlSeconds(expiresAt: number, now: number) {
  return Math.max(Math.ceil((expiresAt - now) / 1000), 0);
}
