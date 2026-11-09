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

/** Menekan aksi dialog berupa tombol. */
function click(action: { label: string; onClick: () => void } | { label: string; href: string } | undefined) {
  if (action && "onClick" in action) action.onClick();
}

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

  it("setelah link terkirim: modal info dengan ilustrasi email dan teks dari spreadsheet, ditutup sekali", async () => {
    const { form, result } = mount();
    act(() => form().email.onChange("you@example.com"));
    act(() => form().submit.onSubmit());
    await waitFor(() => expect(result.current.kind).toBe("sent"));
    expect(result.current.dialog).toMatchObject({
      tone: "info",
      illustration: "email",
      description: "Periksa link tautan yang telah dikirim ke Email anda untuk menyelesaikan Login",
      primary: { label: "Mengerti" },
    });
    const ok = result.current.dialog?.primary;
    act(() => ok && "onClick" in ok && ok.onClick());
    expect(result.current.dialog).toBeUndefined();
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

  it("tanpa koneksi: dialog koneksi bermasalah, coba lagi mengirim ulang permintaan", async () => {
    let attempts = 0;
    server.use(
      http.post(`${MOCK_API_BASE_URL}/auth/magic-link`, () => {
        attempts += 1;
        if (attempts === 1) return HttpResponse.error();
        return HttpResponse.json({ meta: { code: 200, message: "sent" } });
      }),
    );
    const { form, result } = mount();
    act(() => form().email.onChange("you@example.com"));
    act(() => form().submit.onSubmit());
    await waitFor(() => expect(result.current.dialog?.title).toBe("Tidak ada jaringan"));
    expect(form().error).toBeUndefined();
    act(() => click(result.current.dialog?.primary));
    await waitFor(() => expect(result.current.kind).toBe("sent"));
    // Dialog galat diganti modal info link terkirim.
    expect(result.current.dialog?.illustration).toBe("email");
  });

  it("layanan auth galat (5xx): dialog layanan sedang tidak tersedia, email tetap", async () => {
    server.use(
      http.post(`${MOCK_API_BASE_URL}/auth/magic-link`, () =>
        HttpResponse.json({ meta: { code: 503, message: "down" } }, { status: 503 }),
      ),
    );
    const { form, result } = mount();
    act(() => form().email.onChange("you@example.com"));
    act(() => form().submit.onSubmit());
    await waitFor(() => expect(result.current.dialog?.title).toBe("Layanan sedang tidak tersedia"));
    expect(form().email.value).toBe("you@example.com");
    act(() => click(result.current.dialog?.secondary));
    expect(result.current.dialog).toBeUndefined();
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
