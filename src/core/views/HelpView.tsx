import Link from "next/link";
import { CircleHelpIcon, ConstructionIcon, TicketIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/components/ui/cn.utils";
import { PageHeader } from "@/components/ui/layout/PageHeader";
import { SiteShell, type SiteShellProps } from "@/components/ui/layout/SiteShell";
import { t, type MessageKey } from "@/core/i18n/t.utils";

/** Pertanyaan umum dari aturan yang sudah pasti (steering product.md): BR-01, BR-02, BR-05, login opsional, e-tiket. */
const FAQ: { question: MessageKey; answer: MessageKey }[] = [
  { question: "help.faq.quota.q", answer: "help.faq.quota.a" },
  { question: "help.faq.nik.q", answer: "help.faq.nik.a" },
  { question: "help.faq.login.q", answer: "help.faq.login.a" },
  { question: "help.faq.payment.q", answer: "help.faq.payment.a" },
  { question: "help.faq.eticket.q", answer: "help.faq.eticket.a" },
];

/** Pusat Bantuan sementara. Navbar dan footer dari controller supaya status masuk tetap tampil. */
export function HelpView({ nav, footer }: Omit<SiteShellProps, "children">) {
  return (
    <SiteShell nav={nav} footer={footer}>
      <PageHeader
        breadcrumb={[{ label: t("checkout.breadcrumb.home"), href: "/" }, { label: t("home.nav.help") }]}
        heading={t("help.heading")}
        subtitle={t("help.subtitle")}
      />
      <div className="mt-6 grid gap-6 sm:mt-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-8">
        <section aria-labelledby="faq-title" className="flex min-w-0 flex-col gap-4">
          <Alert variant="info" className="border-signal-info">
            <ConstructionIcon />
            <AlertDescription className="text-foreground">{t("help.placeholder")}</AlertDescription>
          </Alert>
          <h2 id="faq-title" className="type-h5 flex items-center gap-2">
            <CircleHelpIcon aria-hidden="true" className="size-5 text-primary" />
            {t("help.faq.title")}
          </h2>
          <div className="flex flex-col gap-3">
            {FAQ.map((item) => (
              <details
                key={item.question}
                className="group rounded-2xl border border-border bg-card p-5 open:border-primary/40"
              >
                <summary className="type-body1 cursor-pointer list-none font-semibold marker:hidden">
                  <span className="flex items-center justify-between gap-4">
                    {t(item.question)}
                    <span
                      aria-hidden="true"
                      className="text-primary transition-transform group-open:rotate-45"
                    >
                      +
                    </span>
                  </span>
                </summary>
                <p className="type-body2 mt-3 text-muted-foreground">{t(item.answer)}</p>
              </details>
            ))}
          </div>
        </section>

        <aside className="flex flex-col gap-6 lg:sticky lg:top-24 lg:self-start">
          <Card className="rounded-2xl">
            <CardContent className="flex flex-col gap-4 p-6">
              <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <TicketIcon aria-hidden="true" className="size-6" />
              </span>
              <div className="flex flex-col gap-1">
                <h2 className="type-h6">{t("help.shortcuts.title")}</h2>
                <p className="type-body2 text-muted-foreground">{t("help.shortcuts.body")}</p>
              </div>
              <Link href="/tickets" className={cn(buttonVariants({ size: "lg" }), "w-full rounded-full")}>
                {t("home.nav.myTickets")}
              </Link>
              <Link
                href="/"
                className={cn(
                  buttonVariants({ size: "lg", variant: "outline" }),
                  "w-full rounded-full border-primary text-primary hover:text-primary",
                )}
              >
                {t("home.nav.explore")}
              </Link>
            </CardContent>
          </Card>
        </aside>
      </div>
    </SiteShell>
  );
}
