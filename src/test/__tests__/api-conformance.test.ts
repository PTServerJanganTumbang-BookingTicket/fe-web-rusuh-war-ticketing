// Kesesuaian FE dan mock dengan kontrak (openapi.json), supaya mengganti mock dengan backend asli cukup dengan
// mengubah NEXT_PUBLIC_API_BASE_URL. Setiap request yang dikirim FE (termasuk lewat route same-origin) dan setiap
// response mock divalidasi terhadap skema kontrak, bukan hanya terhadap contoh.
import { readFileSync } from "node:fs";
import path from "node:path";
import Ajv2020 from "ajv/dist/2020";
import addFormats from "ajv-formats";
import { afterAll, describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { MOCK_API_BASE_URL } from "@/mocks/handlers";
import { admitToQueue, setupMockServer, setupTestContainer } from "../support";

type Schema = Record<string, unknown>;
type Parameter = { name: string; in: "query" | "header" | "path"; required?: boolean };
type Operation = {
  operationId: string;
  parameters?: Parameter[];
  security?: Record<string, unknown>[];
  requestBody?: { required?: boolean; content?: Record<string, { schema?: Schema }> };
  responses: Record<string, { content?: Record<string, { schema?: Schema }> }>;
};

const spec = JSON.parse(readFileSync(path.resolve("src/core/data/http/openapi.json"), "utf8")) as {
  paths: Record<string, Record<string, Operation>>;
};

const ajv = new Ajv2020({ strict: false, allErrors: true });
addFormats(ajv);

// Path literal didahulukan: "/payments/webhook" tidak boleh terbaca sebagai "/payments/{booking_id}".
const templates = Object.entries(spec.paths)
  .flatMap(([template, methods]) =>
    Object.entries(methods).map(([method, operation]) => ({
      method: method.toUpperCase(),
      template,
      operation,
      pattern: new RegExp(`^${template.replace(/\{[^}]+\}/g, "[^/]+")}$`),
    })),
  )
  .sort((a, b) => Number(a.template.includes("{")) - Number(b.template.includes("{")));

const operationFor = (method: string, pathname: string) =>
  templates.find((entry) => entry.method === method && entry.pattern.test(pathname));

const errorsOf = (schema: Schema | undefined, value: unknown) => {
  if (!schema) return [];
  const validate = ajv.compile(schema);
  return validate(value) ? [] : (validate.errors ?? []).map((e) => `${e.instancePath || "$"} ${e.message}`);
};

const server = setupMockServer();
const violations: string[] = [];
const exercised = new Set<string>();
const pending: Promise<void>[] = [];

/** Operasi yang tidak dipanggil FE web: layanan internal, rekonsiliasi admin, dan SSE (diuji terpisah). */
const NOT_USED_BY_FE = new Set(["getDisputedPayments", "queueStream"]);

function record() {
  server.events.on("request:start", ({ request }) => {
    if (!request.url.startsWith(MOCK_API_BASE_URL)) return;
    const url = new URL(request.url);
    const pathname = url.pathname.slice(new URL(MOCK_API_BASE_URL).pathname.replace(/\/$/, "").length);
    const label = `${request.method} ${pathname}`;
    const match = operationFor(request.method, pathname);
    if (!match) {
      violations.push(`${label}: endpoint atau method tidak ada di kontrak`);
      return;
    }
    const { operation } = match;
    exercised.add(operation.operationId);
    for (const param of operation.parameters ?? []) {
      if (param.in === "header" && param.required && !request.headers.has(param.name))
        violations.push(`${label}: header wajib ${param.name} tidak dikirim`);
      if (param.in === "query" && param.required && !url.searchParams.has(param.name))
        violations.push(`${label}: query wajib ${param.name} tidak dikirim`);
    }
    const knownQuery = new Set(
      (operation.parameters ?? []).filter((p) => p.in === "query").map((p) => p.name),
    );
    for (const name of url.searchParams.keys())
      if (!knownQuery.has(name)) violations.push(`${label}: query ${name} tidak ada di kontrak`);
    const bearerOnly =
      operation.security?.length === 1 && Object.keys(operation.security[0] ?? {}).join() === "BearerAuth";
    // E-tiket juga bisa dibuka lewat token tautan email (`?t=`), jadi Bearer tidak wajib bila `t` dikirim.
    const hasLinkToken = knownQuery.has("t") && url.searchParams.has("t");
    if (bearerOnly && !hasLinkToken && !/^Bearer \S+$/.test(request.headers.get("authorization") ?? ""))
      violations.push(`${label}: butuh Authorization: Bearer`);

    const body = operation.requestBody;
    const bodySchema = body?.content?.["application/json"]?.schema;
    const clone = request.clone();
    pending.push(
      clone.text().then((text) => {
        // Body kosong `{}` pada POST tanpa requestBody (mis. retry) diabaikan server.
        if (!body && text && text !== "{}")
          violations.push(`${label}: mengirim body padahal kontrak tidak punya requestBody`);
        if (body?.required && !text) violations.push(`${label}: requestBody wajib tidak dikirim`);
        if (!text || !bodySchema) return;
        for (const error of errorsOf(bodySchema, JSON.parse(text) as unknown))
          violations.push(`${label}: request ${error}`);
      }),
    );
  });

  server.events.on("response:mocked", ({ request, response }) => {
    if (!request.url.startsWith(MOCK_API_BASE_URL)) return;
    // Respons yang sengaja disuntikkan test (mis. 401 untuk memicu refresh) bukan perilaku handler mock.
    if (response.headers.has("x-conformance-skip")) return;
    if ((response.headers.get("content-type") ?? "").includes("text/event-stream")) return;
    const url = new URL(request.url);
    const pathname = url.pathname.slice(new URL(MOCK_API_BASE_URL).pathname.replace(/\/$/, "").length);
    const match = operationFor(request.method, pathname);
    if (!match) return;
    const label = `${request.method} ${pathname} -> ${response.status}`;
    const declared = match.operation.responses[String(response.status)];
    if (!declared) {
      violations.push(`${label}: status tidak dideklarasikan di kontrak`);
      return;
    }
    const schema = declared.content?.["application/json"]?.schema;
    if (!schema) return;
    const clone = response.clone();
    pending.push(
      clone.json().then((json: unknown) => {
        for (const error of errorsOf(schema, json)) violations.push(`${label}: response ${error}`);
      }),
    );
  });
}

describe("kesesuaian FE dan mock dengan openapi.json", () => {
  it("pendeteksi bekerja: endpoint di luar kontrak dan body salah terdeteksi", () => {
    expect(operationFor("PATCH", "/accounts/me/saved-niks/snk_1")).toBeUndefined();
    expect(operationFor("GET", "/accounts/me")).toBeUndefined();
    expect(operationFor("POST", "/payments/webhook")?.operation.operationId).toBe("paymentWebhook");
    expect(operationFor("POST", "/payments/RB-1")?.operation.operationId).toBe("initiatePayment");
    const createBooking = operationFor("POST", "/bookings")?.operation.requestBody?.content?.[
      "application/json"
    ];
    expect(errorsOf(createBooking?.schema, {}).length).toBeGreaterThan(0);
    expect(
      errorsOf(createBooking?.schema, {
        event_id: "e",
        contact_email: "bukan-email",
        terms_version: "v",
        tickets: [],
      }),
    ).not.toEqual([]);
  });

  it("alur lengkap: semua request FE dan response mock sesuai skema kontrak", async () => {
    record();
    const container = setupTestContainer();
    const {
      authService,
      eventService,
      bookingService,
      orderService,
      paymentSimulatorService,
      ticketService,
    } = container.cradle;
    const { savedNikService, holderAliasService } = container.cradle;

    // Auth
    await authService.requestMagicLink("you@example.com");
    await authService.resendMagicLink("you@example.com");
    await authService.register({
      email: "baru@example.com",
      nik: "3171000000000044",
      policyVersion: "2026-10-01",
    });
    await authService.verifyEmail("token-valid");
    await authService.verify("token-valid");

    // Katalog dan antrian
    await eventService.getEvents();
    await eventService.getEvent("evt_konser_a");
    const grant = await admitToQueue(container);
    expect(grant).toMatch(/^gt_/);
    // Polling cadangan (/queue/serving); join dan /queue/me sudah lewat admitToQueue.
    await container.cradle.queueService.getState("evt_konser_a");

    // Booking
    await bookingService.getSession("evt_konser_a");
    await bookingService.validateNik("3171000000000022");
    const { bookingId } = await bookingService.submitBooking({
      eventId: "evt_konser_a",
      contactEmail: "rina@example.com",
      tickets: [
        { categoryId: "cat_vip", holder: { kind: "typed", nik: "3171000000000022" } },
        { categoryId: "cat_festival", holder: { kind: "saved", savedNikId: "snk_1" } },
      ],
    });

    // Pembayaran
    await orderService.getOrder(bookingId);
    await orderService.getAvailableMethods(bookingId);
    await orderService.initiatePayment(bookingId, "bank_transfer", "bca");
    await orderService.getPaymentStatus(bookingId);
    await orderService.retryPayment(bookingId, "gopay");
    await paymentSimulatorService.settle(bookingId, "PAID");
    await orderService.getOrder(bookingId);

    // Akun
    await savedNikService.list();
    await savedNikService.add({ label: "Sari", nik: "3171000000000044" });
    const { savedNiks } = await savedNikService.list();
    await holderAliasService.list();
    await savedNikService.remove(savedNiks[0]?.id ?? "snk_1");
    // 401 pertama memaksa gateway akun memanggil POST /auth/refresh, lalu mengulang request.
    server.use(
      http.get(
        `${MOCK_API_BASE_URL}/users/me/tickets`,
        () => new HttpResponse(null, { status: 401, headers: { "x-conformance-skip": "1" } }),
        {
          once: true,
        },
      ),
    );
    const { tickets } = await ticketService.getMyTickets();
    await ticketService.getETicket(tickets[0]?.id ?? "TKT-001", "signed-token");

    await Promise.all(pending);
    server.events.removeAllListeners();
    expect(violations).toEqual([]);
  });

  afterAll(() => {
    // Setiap operasi kontrak yang dipakai FE web harus tersentuh alur di atas.
    const expected = templates
      .map((entry) => entry.operation.operationId)
      .filter((id) => id && !NOT_USED_BY_FE.has(id));
    const missing = expected.filter((id) => !exercised.has(id));
    if (missing.length) throw new Error(`operasi kontrak belum tersentuh alur uji: ${missing.join(", ")}`);
  });
});
