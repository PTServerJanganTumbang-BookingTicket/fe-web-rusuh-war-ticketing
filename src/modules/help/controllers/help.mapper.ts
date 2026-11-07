import type { SiteChrome } from "@/core/controllers/site-chrome.utils";
import { t, type MessageKey } from "@/core/i18n/t.utils";
import type { HelpViewProps } from "../views/HelpView";

/** Pertanyaan umum dari aturan yang sudah pasti (steering product.md): BR-01, BR-02, BR-05, login opsional, e-tiket. */
const FAQ: { question: MessageKey; answer: MessageKey }[] = [
  { question: "help.faq.quota.q", answer: "help.faq.quota.a" },
  { question: "help.faq.nik.q", answer: "help.faq.nik.a" },
  { question: "help.faq.login.q", answer: "help.faq.login.a" },
  { question: "help.faq.payment.q", answer: "help.faq.payment.a" },
  { question: "help.faq.eticket.q", answer: "help.faq.eticket.a" },
];

/** Pusat Bantuan sementara: semua teks dari i18n, navbar dan footer dari `useSiteChrome`. */
export function toHelpViewProps(chrome: SiteChrome): HelpViewProps {
  return {
    ...chrome,
    header: {
      breadcrumb: [{ label: t("checkout.breadcrumb.home"), href: "/" }, { label: t("home.nav.help") }],
      heading: t("help.heading"),
      subtitle: t("help.subtitle"),
    },
    placeholder: t("help.placeholder"),
    faq: {
      title: t("help.faq.title"),
      items: FAQ.map((item) => ({ question: t(item.question), answer: t(item.answer) })),
    },
    shortcuts: {
      title: t("help.shortcuts.title"),
      body: t("help.shortcuts.body"),
      primary: { label: t("home.nav.myTickets"), href: "/tickets" },
      secondary: { label: t("home.nav.explore"), href: "/" },
    },
  };
}
