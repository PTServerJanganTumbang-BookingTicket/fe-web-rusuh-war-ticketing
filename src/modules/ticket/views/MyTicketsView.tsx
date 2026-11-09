import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Navbar, type NavbarProps } from "@/components/ui/layout/Navbar";
import { Footer } from "@/components/ui/layout/Footer";
import { CardGridSkeleton } from "@/components/ui/layout/PageSkeleton";
import { TicketCard, type TicketCardProps } from "./TicketCard";
import { TicketIcon } from "@/components/ui/icons";

export type MyTicketsViewProps = {
  nav: NavbarProps;
  title: string;
  subtitle: string;
  tickets: TicketCardProps[];
  footer: {
    copyright: string;
    tagline: string;
    infoBanner?: string;
    links?: { label: string; href: string }[];
  };
  emptyLabel?: string;
  errorMessage?: string;
  /** Tamu belum masuk: ajakan masuk menggantikan daftar. */
  signedOut?: { message: string; login: { label: string; href: string } };
  /** Teks status memuat untuk pembaca layar; selama ada, kartu tiket tampil sebagai kerangka. */
  loading?: string;
};

/**
 * My Tickets page view.
 * Displays list of user's tickets.
 */
export function MyTicketsView({
  nav,
  title,
  subtitle,
  tickets,
  footer,
  emptyLabel,
  errorMessage,
  signedOut,
  loading,
}: MyTicketsViewProps) {
  return (
    <div className="flex min-h-screen flex-col bg-signal-disable">
      <Navbar {...nav} />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <section>
          <div className="mb-6">
            <h1 className="type-h3 text-foreground">{title}</h1>
            <p className="type-body1 text-muted-foreground">{subtitle}</p>
          </div>
          {signedOut ? (
            <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
              <TicketIcon aria-hidden="true" className="size-8" />
              <p className="type-body1 text-muted-foreground">{signedOut.message}</p>
              <Link href={signedOut.login.href} className={buttonVariants({ size: "lg" })}>
                {signedOut.login.label}
              </Link>
            </div>
          ) : null}
          {!signedOut && errorMessage && (
            <div className="rounded-lg bg-signal-bg-error p-4 text-signal-error">{errorMessage}</div>
          )}
          {loading ? (
            <div role="status" aria-live="polite" aria-busy="true">
              <span className="sr-only">{loading}</span>
              <CardGridSkeleton />
            </div>
          ) : null}
          {!signedOut && !loading && !errorMessage && tickets.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <TicketIcon aria-hidden="true" className="size-8" />
              <p className="type-body1 text-muted-foreground">{emptyLabel}</p>
            </div>
          )}
          {tickets.length > 0 && (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {tickets.map((ticket) => (
                <TicketCard key={ticket.id} {...ticket} />
              ))}
            </div>
          )}
        </section>
      </main>
      <Footer {...footer} />
    </div>
  );
}
