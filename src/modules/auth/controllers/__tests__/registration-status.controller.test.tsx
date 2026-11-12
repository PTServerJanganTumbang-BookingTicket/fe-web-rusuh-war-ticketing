// @vitest-environment jsdom
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useQueryClient } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { MOCK_API_BASE_URL } from "@/mocks/handlers";
import { createWrapper, setupMockServer, setupTestContainer } from "@/test/support";
import { authKeys } from "../auth.queries";
import { useEmailVerifiedController, useVerifyEmailController } from "../registration-status.controller";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace }) }));

const server = setupMockServer();

/** Email register hanya ada di cache klien; test menyemainya seperti langkah register. */
function Seed({ email, children }: { email?: string; children: ReactNode }) {
  const client = useQueryClient();
  if (email && client.getQueryData(authKeys.pendingRegistration) === undefined) {
    client.setQueryData(authKeys.pendingRegistration, email);
  }
  return <>{children}</>;
}

function mount(email?: string) {
  const Wrapper = createWrapper(setupTestContainer());
  return renderHook(() => useVerifyEmailController(), {
    wrapper: ({ children }) => (
      <Wrapper>
        <Seed email={email}>{children}</Seed>
      </Wrapper>
    ),
  });
}

describe("useVerifyEmailController", () => {
  it("tanpa email tersimpan (muat ulang), kirim ulang tidak tersedia", () => {
    const { result } = mount();
    expect(result.current.tone).toBe("info");
    expect(result.current.action).toBeUndefined();
    expect(result.current.steps).toHaveLength(3);
    expect(result.current.link?.href).toBe("/login");
  });

  it("kirim ulang berhasil menampilkan status terkirim dengan jeda sebelum bisa kirim lagi", async () => {
    const { result } = mount("rina@example.com");
    act(() => result.current.action?.onClick());
    await waitFor(() => expect(result.current.tone).toBe("success"));
    expect(result.current.action?.disabled).toBe(true);
  });

  it("kirim ulang gagal menampilkan galat dan tombol tetap bisa dicoba lagi", async () => {
    server.use(http.post(`${MOCK_API_BASE_URL}/auth/magic-link/resend`, () => HttpResponse.error()));
    const { result } = mount("rina@example.com");
    act(() => result.current.action?.onClick());
    await waitFor(() => expect(result.current.error).toBeTruthy());
    expect(result.current.tone).toBe("info");
    expect(result.current.action?.disabled).toBe(false);
  });
});

describe("useEmailVerifiedController", () => {
  const visit = (suffix: string) => window.history.replaceState(null, "", `/register/verified${suffix}`);
  const mountVerified = () =>
    renderHook(() => useEmailVerifiedController(), { wrapper: createWrapper(setupTestContainer()) });

  afterEach(() => visit(""));

  it("token valid di query: memverifikasi lalu menampilkan email terverifikasi dengan tautan masuk", async () => {
    visit("?token=abc");
    const { result } = mountVerified();
    expect(result.current.tone).toBe("info");
    await waitFor(() => expect(result.current.tone).toBe("success"));
    expect(result.current.link).toEqual({ label: "Lanjut ke halaman masuk", href: "/login" });
    expect(result.current.secondaryLink).toEqual({ label: "Kembali ke beranda", href: "/" });
    expect(result.current.detail).toBe("Kamu akan diarahkan ke halaman masuk dalam 10 detik.");
  });

  it("10 detik setelah terverifikasi, otomatis diarahkan ke halaman masuk", async () => {
    visit("?token=abc");
    const { result } = mountVerified();
    await waitFor(() => expect(result.current.tone).toBe("success"));
    expect(replace).not.toHaveBeenCalled();
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/login"), { timeout: 13000 });
  }, 16000);

  it("token di fragmen URL juga dikenali", async () => {
    visit("#token=abc");
    const { result } = mountVerified();
    await waitFor(() => expect(result.current.tone).toBe("success"));
  });

  it("token kedaluwarsa atau sudah dipakai: pesan tautan tidak berlaku dan arahan minta link login", async () => {
    visit("?token=expired");
    const { result } = mountVerified();
    await waitFor(() => expect(result.current.tone).toBe("error"));
    expect(result.current.title).toBe("Link verifikasi tidak berlaku");
    expect(result.current.detail).toContain("link login");
    expect(result.current.link?.href).toBe("/login");
    expect(result.current.action).toBeUndefined();
  });

  it("tanpa token: tautan tidak lengkap, tidak ada klaim terverifikasi", () => {
    visit("");
    const { result } = mountVerified();
    expect(result.current.tone).toBe("error");
  });

  it("koneksi putus: bisa dicoba lagi, tanpa menyebut tautan kedaluwarsa", async () => {
    visit("?token=abc");
    server.use(http.get(`${MOCK_API_BASE_URL}/auth/verify-email`, () => HttpResponse.error()));
    const { result } = mountVerified();
    await waitFor(() => expect(result.current.tone).toBe("error"));
    expect(result.current.message).toContain("Koneksi bermasalah");
    expect(result.current.action?.label).toBe("Coba lagi");
  });
});
