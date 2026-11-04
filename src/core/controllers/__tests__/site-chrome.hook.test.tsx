// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { createWrapper, setupMockServer, setupTestContainer } from "@/test/support";
import { useSiteChrome } from "../site-chrome.hook";

setupMockServer();

describe("useSiteChrome", () => {
  it("tamu tetap melihat tombol masuk", async () => {
    const container = setupTestContainer();
    const { result } = renderHook(() => useSiteChrome(), { wrapper: createWrapper(container) });
    await waitFor(() => expect(result.current.nav.loginHref).toBe("/login"));
    expect(result.current.nav.account).toBeUndefined();
  });

  it("setelah masuk, navbar menampilkan akun dari sesi", async () => {
    const container = setupTestContainer();
    await container.cradle.verifyLoginUseCase("mt_nav");
    const { result } = renderHook(() => useSiteChrome({ active: "/" }), {
      wrapper: createWrapper(container),
    });
    await waitFor(() => expect(result.current.nav.account?.label).toBe("you"));
    expect(result.current.nav.account?.href).toBe("/account");
    expect(result.current.nav.items[0]?.active).toBe(true);
  });
});
