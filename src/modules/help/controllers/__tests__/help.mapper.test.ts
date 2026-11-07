import { describe, expect, it } from "vitest";
import { toSiteChrome } from "@/core/controllers/site-chrome.utils";
import { toHelpViewProps } from "../help.mapper";

describe("toHelpViewProps", () => {
  it("memetakan FAQ dan pintasan dari i18n tanpa teks mentah di view", () => {
    const props = toHelpViewProps(toSiteChrome({ active: "/help" }));
    expect(props.faq.items).toHaveLength(5);
    expect(props.faq.items.every((item) => item.question && item.answer)).toBe(true);
    expect(props.shortcuts.primary).toEqual({ label: "Tiket saya", href: "/tickets" });
    expect(props.nav.items.find((item) => item.href === "/help")?.active).toBe(true);
  });
});
