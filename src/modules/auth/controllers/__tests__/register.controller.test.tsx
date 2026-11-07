// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { MOCK_API_BASE_URL } from "@/mocks/handlers";
import { createWrapper, setupMockServer } from "@/test/support";
import { useRegisterController } from "../register.controller";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, replace: vi.fn() }) }));

const server = setupMockServer();

/** Menekan aksi dialog berupa tombol. */
function click(action: { label: string; onClick: () => void } | { label: string; href: string } | undefined) {
  if (action && "onClick" in action) action.onClick();
}

function mount() {
  const hook = renderHook(() => useRegisterController(), { wrapper: createWrapper() });
  const form = () => {
    const view = hook.result.current;
    if (view.kind !== "form") throw new Error("bukan form");
    return view;
  };
  const fill = (values: { email?: string; nik?: string; consent?: boolean }) =>
    act(() => {
      if (values.email !== undefined) form().email.onChange(values.email);
      if (values.nik !== undefined) form().nik.onChange(values.nik);
      if (values.consent !== undefined) form().consent.onChange(values.consent);
    });
  return { ...hook, form, fill };
}

describe("useRegisterController", () => {
  it("persetujuan tidak tercentang otomatis dan wajib dicentang", () => {
    const { form, fill } = mount();
    expect(form().consent.checked).toBe(false);
    fill({ email: "alex@example.com", nik: "3171000000000044" });
    act(() => form().submit.onSubmit());
    expect(form().consent.error).toBe("Persetujuan diperlukan untuk membuat akun.");
  });

  it("NIK hanya menerima digit dan harus 16 digit", () => {
    const { form, fill } = mount();
    fill({ email: "alex@example.com", nik: "3171 0000-0000", consent: true });
    expect(form().nik.value).toBe("317100000000");
    act(() => form().submit.onSubmit());
    expect(form().nik.error).toBe("NIK harus 16 digit angka.");
  });

  it("mengirim persetujuan dengan versi kebijakan lalu menampilkan layar cek email", async () => {
    let body: unknown;
    server.use(
      http.post(`${MOCK_API_BASE_URL}/auth/register`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({
          meta: { code: 200, message: "Verification link sent" },
          data: { user_id: "u" },
        });
      }),
    );
    const { form, fill, result } = mount();
    fill({ email: "alex@example.com", nik: "3171000000000044", consent: true });
    act(() => form().name.onChange(" Alex "));
    act(() => form().submit.onSubmit());
    // Submit hanya membuka tinjauan; belum ada request sampai dikonfirmasi.
    expect(body).toBeUndefined();
    const review = result.current.dialog;
    expect(review?.title).toBe("Konfirmasi datamu");
    expect(review?.details?.map((item) => item.value)).toEqual([
      "alex@example.com",
      "3171000000000044",
      "Alex",
    ]);
    act(() => click(review?.primary));
    await waitFor(() => expect(result.current.dialog?.tone).toBe("success"));
    act(() => click(result.current.dialog?.primary));
    expect(push).toHaveBeenCalledWith("/register/verify-email");
    expect(body).toEqual({
      email: "alex@example.com",
      nik: "3171000000000044",
      name: "Alex",
      consent: { accepted: true, policy_version: "2026-10-01" },
    });
  });

  it("NIK sudah terdaftar (409): dialog akun sudah terdaftar, Ubah email memfokus field email", async () => {
    const { form, fill, result } = mount();
    fill({ email: "alex@example.com", nik: "3171000000000022", consent: true });
    act(() => form().submit.onSubmit());
    act(() => click(result.current.dialog?.primary));
    await waitFor(() => expect(result.current.dialog?.title).toBe("Akun sudah terdaftar"));
    expect(result.current.dialog?.primary).toEqual({ label: "Masuk", href: "/login" });
    // Isian tetap; "Ubah email" menutup dialog tanpa request dan memfokus email.
    act(() => click(result.current.dialog?.secondary));
    expect(result.current.dialog).toBeUndefined();
    expect(form().nik.value).toBe("3171000000000022");
    expect(form().email.focusKey).toBe(1);
  });

  it("server galat (5xx): dialog pendaftaran gagal, coba lagi mengirim ulang", async () => {
    let attempts = 0;
    server.use(
      http.post(`${MOCK_API_BASE_URL}/auth/register`, () => {
        attempts += 1;
        if (attempts === 1)
          return HttpResponse.json({ meta: { code: 500, message: "boom" } }, { status: 500 });
        return HttpResponse.json({ meta: { code: 200, message: "ok" }, data: { user_id: "u" } });
      }),
    );
    const { form, fill, result } = mount();
    fill({ email: "alex@example.com", nik: "3171000000000044", consent: true });
    act(() => form().submit.onSubmit());
    act(() => click(result.current.dialog?.primary));
    await waitFor(() => expect(result.current.dialog?.title).toBe("Pendaftaran gagal"));
    expect(result.current.dialog?.secondary?.label).toBe("Tutup");
    act(() => click(result.current.dialog?.primary));
    await waitFor(() => expect(result.current.dialog?.tone).toBe("success"));
    expect(attempts).toBe(2);
  });

  it("tanpa koneksi: dialog koneksi bermasalah", async () => {
    server.use(http.post(`${MOCK_API_BASE_URL}/auth/register`, () => HttpResponse.error()));
    const { form, fill, result } = mount();
    fill({ email: "alex@example.com", nik: "3171000000000044", consent: true });
    act(() => form().submit.onSubmit());
    act(() => click(result.current.dialog?.primary));
    await waitFor(() => expect(result.current.dialog?.title).toBe("Koneksi bermasalah"));
  });

  it("NIK ditolak Dukcapil (400): dialog Periksa NIK, Ubah data memfokus field NIK", async () => {
    const { form, fill, result } = mount();
    fill({ email: "alex@example.com", nik: "3171000000000099", consent: true });
    server.use(
      http.post(`${MOCK_API_BASE_URL}/auth/register`, () =>
        HttpResponse.json({ meta: { code: 400, message: "NIK invalid" } }, { status: 400 }),
      ),
    );
    act(() => form().submit.onSubmit());
    act(() => click(result.current.dialog?.primary));
    await waitFor(() => expect(result.current.dialog?.title).toBe("Periksa NIK-mu"));
    act(() => click(result.current.dialog?.primary));
    expect(form().nik.focusKey).toBe(1);
  });
});
