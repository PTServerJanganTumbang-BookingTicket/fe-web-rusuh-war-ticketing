// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { MOCK_API_BASE_URL } from "@/mocks/handlers";
import { createWrapper, setupMockServer } from "@/test/support";
import { useLoginController } from "../login.controller";

let search = "";
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams(search) }));

const server = setupMockServer();

afterEach(() => {
  search = "";
});

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
  it("form awal: tombol mati sampai email diisi, fokus saja tidak memunculkan galat", () => {
    const { form } = mount();
    expect(form().submit.disabled).toBe(true);
    expect(form().email.error).toBeUndefined();
    expect(form().inboxHint).toBe("Klik link di inbox-mu untuk menyelesaikan login.");
    act(() => form().email.onChange("you@example.com"));
    expect(form().submit.disabled).toBe(false);
  });

  it("email tidak valid: galat setelah field ditinggalkan, tombol diblokir", () => {
    const { form } = mount();
    act(() => form().email.onChange("you@"));
    expect(form().email.error).toBeUndefined();
    act(() => form().email.onBlur());
    expect(form().email.error).toBe("Masukkan alamat email yang valid.");
    expect(form().submit.disabled).toBe(true);
  });

  it("kirim dengan Enter saat kosong: email wajib diisi", () => {
    const { form } = mount();
    act(() => form().submit.onSubmit());
    expect(form().email.error).toBe("Alamat email wajib diisi.");
  });

  it("sesi berakhir: judul dan tombol berbeda, tanpa tautan daftar", () => {
    search = "session=expired";
    const { form } = mount();
    expect(form().variant).toBe("expired");
    expect(form().heading).toBe("Sesimu sudah berakhir");
    expect(form().submit.label).toBe("Kirim link login baru");
    expect(form().register).toBeUndefined();
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
    // Pesan generik: tidak menyebut email dan tidak membedakan akun terdaftar atau tidak.
    expect(sent().message).not.toContain("you@example.com");
    expect(sent().notice.title).toBe("Link aman, bukan kata sandi.");
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
