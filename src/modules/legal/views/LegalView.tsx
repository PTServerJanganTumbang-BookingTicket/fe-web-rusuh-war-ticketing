import Link from "next/link";
import { ConstructionIcon } from "@/components/ui/icons";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PageHeader, type PageHeaderProps } from "@/components/ui/layout/PageHeader";
import { SiteShell, type SiteShellProps } from "@/components/ui/layout/SiteShell";

export type LegalViewProps = Omit<SiteShellProps, "children"> & {
  header: PageHeaderProps;
  /** Pemberitahuan bahwa teks masih draf menunggu tinjauan tim hukum. */
  notice: string;
  sections: { title: string; body: string }[];
  other: { label: string; href: string };
  version: string;
};

/** Dokumen hukum satu kolom. Props-only: teks dari `legal.mapper.ts`. */
export function LegalView({ nav, footer, header, notice, sections, other, version }: LegalViewProps) {
  return (
    <SiteShell nav={nav} footer={footer}>
      <PageHeader {...header} />
      <article className="mt-6 flex max-w-3xl flex-col gap-6 sm:mt-8">
        <Alert variant="info" role="note" className="border-signal-info">
          <ConstructionIcon />
          <AlertDescription className="text-foreground">{notice}</AlertDescription>
        </Alert>
        {sections.map((section, index) => (
          <section key={section.title} aria-labelledby={`legal-s${index}`} className="flex flex-col gap-2">
            <h2 id={`legal-s${index}`} className="type-h6">
              {index + 1}. {section.title}
            </h2>
            <p className="type-body1 text-muted-foreground">{section.body}</p>
          </section>
        ))}
        <p className="type-body2 text-muted-foreground">{version}</p>
        <Link
          href={other.href}
          className="type-body2 font-semibold text-primary underline-offset-4 hover:underline"
        >
          {other.label}
        </Link>
      </article>
    </SiteShell>
  );
}
