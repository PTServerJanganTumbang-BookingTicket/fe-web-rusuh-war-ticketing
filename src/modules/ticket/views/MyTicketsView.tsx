import { Navbar, type NavbarProps } from "@/components/ui/layout/Navbar";
import { Footer } from "@/components/ui/layout/Footer";
import { TicketCard, type TicketCardProps } from "./TicketCard";

export type MyTicketsViewProps = {
  nav: NavbarProps;
  title: string;
  subtitle: string;
  tickets: TicketCardProps[];
  footer: {
    copyright: string;
    tagline: string;
    infoBanner?: string;
  };
  emptyLabel?: string;
  errorMessage?: string;
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
          {errorMessage && (
            <div className="rounded-lg bg-signal-bg-error p-4 text-signal-error">{errorMessage}</div>
          )}
          {!errorMessage && tickets.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <svg
                width="64"
                height="64"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mb-4 text-muted-foreground"
                aria-hidden="true"
              >
                <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
                <path d="M13 5v2" />
                <path d="M13 17v2" />
                <path d="M13 11v2" />
              </svg>
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
