import Link from "next/link";
import { ShieldCheckIcon } from "../icons";

export type FooterProps = {
  copyright: string;
  tagline: string;
  infoBanner?: string;
  /** Tautan dokumen hukum (Syarat dan Ketentuan, Kebijakan Privasi). */
  links?: { label: string; href: string }[];
};

export function Footer({ copyright, tagline, infoBanner, links }: FooterProps) {
  return (
    <footer className="mt-auto border-t border-border bg-background">
      {infoBanner && (
        <div className="border-b border-border bg-muted/50 px-4 py-3">
          <div className="mx-auto flex max-w-7xl items-center gap-2 text-sm text-muted-foreground">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
            {infoBanner}
          </div>
        </div>
      )}
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-4">
          <span className="type-body2 text-muted-foreground">{copyright}</span>
          {links?.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="type-body2 text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              {link.label}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-2 type-body2 text-muted-foreground">
          <ShieldCheckIcon aria-hidden="true" className="size-4 shrink-0" />
          {tagline}
        </div>
      </div>
    </footer>
  );
}
