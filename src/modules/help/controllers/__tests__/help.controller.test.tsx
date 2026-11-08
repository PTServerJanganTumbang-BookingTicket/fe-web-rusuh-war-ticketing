// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { createWrapper, setupMockServer, setupTestContainer } from "@/test/support";
import { useHelpController } from "../help.controller";

setupMockServer();

describe("useHelpController", () => {
  it("menandai menu Bantuan aktif dan memuat FAQ", async () => {
    const { result } = renderHook(() => useHelpController(), {
      wrapper: createWrapper(setupTestContainer()),
    });
    await waitFor(() => expect(result.current.nav.items.some((item) => item.active)).toBe(true));
    expect(result.current.nav.items.find((item) => item.active)?.href).toBe("/help");
    expect(result.current.faq.items.length).toBeGreaterThan(0);
    expect(result.current.header.heading).toBeTruthy();
  });
});
