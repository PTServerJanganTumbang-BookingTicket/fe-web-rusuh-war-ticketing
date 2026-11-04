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
    if (review?.kind !== "confirm") throw new Error("dialog tinjauan tidak muncul");
    expect(review.values.map((item) => item.value)).toEqual(["alex@example.com", "3171000000000044", "Alex"]);
    act(() => review.confirm.onClick());
    await waitFor(() => expect(result.current.dialog?.kind).toBe("success"));
    act(() => (result.current.dialog?.kind === "success" ? result.current.dialog.ok.onClick() : undefined));
    expect(push).toHaveBeenCalledWith("/register/verify-email");
    expect(body).toEqual({
      email: "alex@example.com",
      nik: "3171000000000044",
      name: "Alex",
      consent: { accepted: true, policy_version: "2026-10-01" },
    });
  });

  it("NIK sudah terdaftar (409): pesan khusus", async () => {
    const { form, fill, result } = mount();
    fill({ email: "alex@example.com", nik: "3171000000000022", consent: true });
    act(() => form().submit.onSubmit());
    act(() =>
      result.current.dialog?.kind === "confirm" ? result.current.dialog.confirm.onClick() : undefined,
    );
    await waitFor(() =>
      expect(result.current.dialog?.kind === "confirm" && result.current.dialog.error).toBe(
        "NIK ini sudah terdaftar di akun lain.",
      ),
    );
    // Galat membuka kunci tanpa menghapus isian; "Ubah data" kembali ke form tanpa request.
    expect(form().nik.value).toBe("3171000000000022");
    act(() => (result.current.dialog?.kind === "confirm" ? result.current.dialog.edit.onClick() : undefined));
    expect(result.current.dialog).toBeUndefined();
  });
});
