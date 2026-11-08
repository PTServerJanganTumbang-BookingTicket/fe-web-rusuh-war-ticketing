// @vitest-environment jsdom
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useQueryClient } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { MOCK_API_BASE_URL } from "@/mocks/handlers";
import { createWrapper, setupMockServer, setupTestContainer } from "@/test/support";
import { authKeys } from "../auth.queries";
import { useEmailVerifiedController, useVerifyEmailController } from "../registration-status.controller";

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
  it("layar statis: email terverifikasi dengan tautan masuk", () => {
    const { result } = renderHook(() => useEmailVerifiedController(), { wrapper: createWrapper() });
    expect(result.current.tone).toBe("success");
    expect(result.current.link?.href).toBe("/login");
  });
});
