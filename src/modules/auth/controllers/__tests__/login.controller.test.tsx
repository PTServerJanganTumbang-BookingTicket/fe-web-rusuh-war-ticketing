// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { MOCK_API_BASE_URL } from "@/mocks/handlers";
import { createWrapper, setupMockServer } from "@/test/support";
import { useLoginController } from "../login.controller";

const server = setupMockServer();

function mount() {
  const hook = renderHook(() => useLoginController(), { wrapper: createWrapper() });
  const form = () => {
    const view = hook.result.current;
    if (view.kind !== "form") throw new Error("bukan form");
    return view;
  };
  const sent = () => {
    const view = hook.result.current;
    if (view.kind !== "sent") throw new Error("belum terkirim");
    return view;
  };
  return { ...hook, form, sent };
}

describe("useLoginController", () => {
  it("email tidak valid: galat di field, tanpa request", () => {
    const { form } = mount();
    act(() => form().email.onChange("bukan-email"));
    act(() => form().submit.onSubmit());
    expect(form().email.error).toBe("Masukkan alamat email yang valid.");
  });

  it("mengirim link lalu menampilkan layar cek email dengan jeda kirim ulang", async () => {
    let body: unknown;
    server.use(
      http.post(`${MOCK_API_BASE_URL}/auth/magic-link`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ meta: { code: 200, message: "Login link sent to your email" } });
      }),
    );
    const { form, sent, result } = mount();
    act(() => form().email.onChange("  you@example.com "));
    act(() => form().submit.onSubmit());
    await waitFor(() => expect(result.current.kind).toBe("sent"));
    expect(body).toEqual({ email: "you@example.com" });
    expect(sent().message).toContain("you@example.com");
    expect(sent().resend.disabled).toBe(true);
    expect(sent().resend.label).toMatch(/^Kirim ulang dalam \d+ detik$/);
    // Mode mock: tautan pengganti email menuju layar verifikasi dengan token di fragmen.
    expect(sent().mockLink?.href).toMatch(/^\/login\/verify#token=/);
  });

  it("429 dari server: pesan batas permintaan, tetap di form", async () => {
    server.use(
      http.post(`${MOCK_API_BASE_URL}/auth/magic-link`, () =>
        HttpResponse.json(
          { meta: { code: 429, message: "wait" }, data: { retry_after: 60 } },
          { status: 429 },
        ),
      ),
    );
    const { form, result } = mount();
    act(() => form().email.onChange("you@example.com"));
    act(() => form().submit.onSubmit());
    await waitFor(() =>
      expect(result.current.error).toBe("Terlalu banyak permintaan. Tunggu sebentar lalu coba lagi."),
    );
    expect(result.current.kind).toBe("form");
  });

  it("ganti email kembali ke form", async () => {
    const { form, sent, result } = mount();
    act(() => form().email.onChange("you@example.com"));
    act(() => form().submit.onSubmit());
    await waitFor(() => expect(result.current.kind).toBe("sent"));
    act(() => sent().changeEmail.onClick());
    expect(result.current.kind).toBe("form");
  });
});
