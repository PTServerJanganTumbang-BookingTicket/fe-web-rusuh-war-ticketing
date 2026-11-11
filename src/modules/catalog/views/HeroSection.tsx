import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/components/ui/cn.utils";
import { ChevronDownIcon } from "@/components/ui/icons";

export type HeroSectionProps = {
  eyebrow: string;
  headline: string;
  subtext: string;
  /** Label tombol yang menggulir ke daftar event; tanpa ini tombol tidak tampil. */
  cta?: string;
  ctaHref?: string;
  backgroundImage?: string;
};

const DEFAULT_HERO_IMAGE = "/images/concert-placeholder.webp";

// Masuk bertahap (eyebrow → judul → teks → tombol). `fill-mode-backwards` menahan elemen tak terlihat selama jeda.
const ENTER =
  "animate-in fade-in slide-in-from-bottom-3 duration-700 fill-mode-backwards motion-reduce:animate-none";

export function HeroSection({
  eyebrow,
  headline,
  subtext,
  cta,
  ctaHref,
  backgroundImage = DEFAULT_HERO_IMAGE,
}: HeroSectionProps) {
  return (
    <section
      className="relative isolate overflow-hidden rounded-2xl bg-cover bg-center px-6 py-14 sm:px-10 md:px-14 md:py-20"
      style={{ backgroundImage: `url(${backgroundImage})` }}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-linear-to-r from-black/85 via-black/60 to-black/10"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-linear-to-t from-black/50 via-transparent to-transparent"
      />
      <div className="relative z-10 max-w-2xl">
        <div
          className={cn(
            "mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 py-1.5 pr-4 pl-3 text-white backdrop-blur-sm",
            ENTER,
          )}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
            className="text-primary"
          >
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
          <span className="type-body2 font-semibold tracking-wider uppercase">{eyebrow}</span>
        </div>
        <h1 className={cn("type-h1 mb-4 text-balance text-white italic delay-100", ENTER)}>{headline}</h1>
        <p className={cn("type-body1 mb-8 max-w-xl text-white/90 delay-200", ENTER)}>{subtext}</p>
        {cta && ctaHref ? (
          <a href={ctaHref} className={cn(buttonVariants({ size: "lg" }), "group delay-300", ENTER)}>
            {cta}
            <ChevronDownIcon
              aria-hidden="true"
              className="size-5 transition-transform duration-300 group-hover:translate-y-0.5 motion-reduce:transition-none"
            />
          </a>
        ) : null}
      </div>
    </section>
  );
}
