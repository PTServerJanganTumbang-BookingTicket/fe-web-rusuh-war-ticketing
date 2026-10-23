import { AudioLines } from "lucide-react";

export type LogoProps = { href: string; label: string; tagline: string };

/** Wordmark "rusuh." dengan ikon gelombang suara (Figma SJT ZAKI, navbar). */
export function Logo({ href, label, tagline }: LogoProps) {
  return (
    <a href={href} className="flex items-center gap-3 rounded-lg outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50">
      <span aria-hidden className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
        <AudioLines className="size-5" />
      </span>
      <span className="flex flex-col leading-none">
        <span className="type-h5 font-bold">{label}</span>
        <span className="mt-1 text-[0.625rem] font-medium tracking-[0.08em] text-muted-foreground uppercase">{tagline}</span>
      </span>
    </a>
  );
}
