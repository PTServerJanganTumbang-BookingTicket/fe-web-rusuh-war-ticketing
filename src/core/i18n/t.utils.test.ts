import { describe, expect, it } from "vitest";
import { t } from "./t.utils";

describe("t", () => {
  it("mengganti placeholder", () => {
    expect(t("queue.position.value", { position: "1.248" })).toBe("#1.248");
    expect(t("queue.eta.value", { minutes: 4 })).toBe("± 4 menit");
  });

  it("membiarkan placeholder tanpa nilai", () => {
    expect(t("queue.position.value")).toBe("#{position}");
  });
});
