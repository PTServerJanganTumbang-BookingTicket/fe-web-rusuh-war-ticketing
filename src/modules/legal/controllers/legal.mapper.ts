import type { SiteChrome } from "@/core/controllers/site-chrome.utils";
import { t, type MessageKey } from "@/core/i18n/t.utils";
import { LEGAL_DOCUMENT_VERSION } from "../domain/legal.constants";
import type { LegalViewProps } from "../views/LegalView";

export type LegalDocument = "terms" | "privacy";

type Section = { title: MessageKey; body: MessageKey };

const SECTIONS: Record<LegalDocument, Section[]> = {
  terms: [
    { title: "legal.terms.s1.title", body: "legal.terms.s1.body" },
    { title: "legal.terms.s2.title", body: "legal.terms.s2.body" },
    { title: "legal.terms.s3.title", body: "legal.terms.s3.body" },
    { title: "legal.terms.s4.title", body: "legal.terms.s4.body" },
    { title: "legal.terms.s5.title", body: "legal.terms.s5.body" },
  ],
  privacy: [
    { title: "legal.privacy.s1.title", body: "legal.privacy.s1.body" },
    { title: "legal.privacy.s2.title", body: "legal.privacy.s2.body" },
    { title: "legal.privacy.s3.title", body: "legal.privacy.s3.body" },
    { title: "legal.privacy.s4.title", body: "legal.privacy.s4.body" },
    { title: "legal.privacy.s5.title", body: "legal.privacy.s5.body" },
  ],
};

const HEADINGS: Record<LegalDocument, { heading: MessageKey; intro: MessageKey; other: MessageKey }> = {
  terms: { heading: "legal.terms.heading", intro: "legal.terms.intro", other: "legal.privacy.heading" },
  privacy: { heading: "legal.privacy.heading", intro: "legal.privacy.intro", other: "legal.terms.heading" },
};

/** Syarat dan Ketentuan serta Kebijakan Privasi: semua teks dari i18n, navbar dan footer dari `useSiteChrome`. */
export function toLegalViewProps(document: LegalDocument, chrome: SiteChrome): LegalViewProps {
  const { heading, intro, other } = HEADINGS[document];
  return {
    ...chrome,
    header: {
      breadcrumb: [{ label: t("checkout.breadcrumb.home"), href: "/" }, { label: t(heading) }],
      heading: t(heading),
      subtitle: t(intro),
    },
    notice: t("legal.draft"),
    sections: SECTIONS[document].map((section) => ({ title: t(section.title), body: t(section.body) })),
    other: { label: t(other), href: document === "terms" ? "/privacy" : "/terms" },
    version: t("legal.version", { version: LEGAL_DOCUMENT_VERSION }),
  };
}
