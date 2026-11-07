import Link from "next/link";
import { CircleHelpIcon, ConstructionIcon, TicketIcon } from "@/components/ui/icons";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/components/ui/cn.utils";
import { PageHeader, type PageHeaderProps } from "@/components/ui/layout/PageHeader";
import { SiteShell, type SiteShellProps } from "@/components/ui/layout/SiteShell";

type LinkAction = { label: string; href: string };

export type HelpViewProps = Omit<SiteShellProps, "children"> & {
  header: PageHeaderProps;
  placeholder: string;
  faq: { title: string; items: { question: string; answer: string }[] };
  shortcuts: { title: string; body: string; primary: LinkAction; secondary: LinkAction };
};

/** Pusat Bantuan. Props-only: teks dan tautan dari `help.controller.ts`. */
export function HelpView({ nav, footer, header, placeholder, faq, shortcuts }: HelpViewProps) {
  return (
    <SiteShell nav={nav} footer={footer}>
      <PageHeader {...header} />
      <div className="mt-6 grid gap-6 sm:mt-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-8">
        <section aria-labelledby="faq-title" className="flex min-w-0 flex-col gap-4">
          <Alert variant="info" className="border-signal-info">
            <ConstructionIcon />
            <AlertDescription className="text-foreground">{placeholder}</AlertDescription>
          </Alert>
          <h2 id="faq-title" className="type-h5 flex items-center gap-2">
            <CircleHelpIcon aria-hidden="true" className="size-5 text-primary" />
            {faq.title}
          </h2>
          <div className="flex flex-col gap-3">
            {faq.items.map((item) => (
              <details
                key={item.question}
                className="group rounded-2xl border border-border bg-card p-5 open:border-primary/40"
              >
                <summary className="type-body1 cursor-pointer list-none font-semibold marker:hidden">
                  <span className="flex items-center justify-between gap-4">
                    {item.question}
                    <span
                      aria-hidden="true"
                      className="text-primary transition-transform group-open:rotate-45"
                    >
                      +
                    </span>
                  </span>
                </summary>
                <p className="type-body2 mt-3 text-muted-foreground">{item.answer}</p>
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
                <h2 className="type-h6">{shortcuts.title}</h2>
                <p className="type-body2 text-muted-foreground">{shortcuts.body}</p>
              </div>
              <Link
                href={shortcuts.primary.href}
                className={cn(buttonVariants({ size: "lg" }), "w-full rounded-full")}
              >
                {shortcuts.primary.label}
              </Link>
              <Link
                href={shortcuts.secondary.href}
                className={cn(
                  buttonVariants({ size: "lg", variant: "outline" }),
                  "w-full rounded-full border-primary text-primary hover:text-primary",
                )}
              >
                {shortcuts.secondary.label}
              </Link>
            </CardContent>
          </Card>
        </aside>
      </div>
    </SiteShell>
  );
}
