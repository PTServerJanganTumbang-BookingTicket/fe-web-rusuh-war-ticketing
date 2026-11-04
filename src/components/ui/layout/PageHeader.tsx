import Link from "next/link";
import { CheckIcon } from "lucide-react";
import { cn } from "../cn.utils";

export type Crumb = { label: string; href?: string };
export type CheckoutStep = { label: string; state: "done" | "current" | "upcoming" };

export type PageHeaderProps = {
  breadcrumb: Crumb[];
  /** Langkah checkout (Pilih tiket → Pembayaran → Selesai). Tidak ada untuk halaman di luar checkout. */
  steps?: CheckoutStep[];
  heading: string;
  subtitle: string;
};

export function Breadcrumb({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="type-body2 flex flex-wrap items-center gap-x-2 gap-y-1 text-muted-foreground">
        {items.map((crumb, index) => (
          <li key={`${crumb.label}-${index}`} className="flex items-center gap-2">
            {index > 0 ? <span aria-hidden="true">/</span> : null}
            {crumb.href ? (
              <Link href={crumb.href} className="hover:text-foreground">
                {crumb.label}
              </Link>
            ) : (
              <span aria-current="page">{crumb.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

// Kelas ditulis utuh supaya terdeteksi Tailwind.
const stepTone = {
  done: "bg-primary text-primary-foreground",
  current: "bg-primary text-primary-foreground",
  upcoming: "bg-signal-disable text-muted-foreground",
};

export function CheckoutSteps({ steps }: { steps: CheckoutStep[] }) {
  return (
    <ol className="flex flex-wrap items-center gap-x-6 gap-y-2">
      {steps.map((step, index) => (
        <li
          key={step.label}
          aria-current={step.state === "current" ? "step" : undefined}
          className={cn(
            "type-body2 flex items-center gap-2",
            step.state === "upcoming" ? "text-muted-foreground" : "text-foreground",
          )}
        >
          <span
            aria-hidden="true"
            className={cn(
              "flex size-6 items-center justify-center rounded-full text-xs font-semibold",
              stepTone[step.state],
            )}
          >
            {step.state === "done" ? <CheckIcon className="size-3.5" /> : index + 1}
          </span>
          {step.label}
        </li>
      ))}
    </ol>
  );
}

/** Breadcrumb, langkah checkout, judul, dan subjudul di atas setiap halaman alur pembelian. */
export function PageHeader({ breadcrumb, steps, heading, subtitle }: PageHeaderProps) {
  return (
    <header className="flex flex-col gap-4">
      <Breadcrumb items={breadcrumb} />
      {steps ? <CheckoutSteps steps={steps} /> : null}
      <div className="flex flex-col gap-2">
        <h1 className="type-h3 sm:type-h2 text-foreground">{heading}</h1>
        <p className="type-title text-muted-foreground">{subtitle}</p>
      </div>
    </header>
  );
}
