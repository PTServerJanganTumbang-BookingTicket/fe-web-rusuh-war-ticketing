export type HeroSectionProps = {
  eyebrow: string;
  headline: string;
  subtext: string;
  backgroundImage?: string;
};

const DEFAULT_HERO_IMAGE = "/images/concert-placeholder.webp";

export function HeroSection({
  eyebrow,
  headline,
  subtext,
  backgroundImage = DEFAULT_HERO_IMAGE,
}: HeroSectionProps) {
  return (
    <section
      className="relative overflow-hidden rounded-2xl bg-cover bg-center px-8 py-12 md:px-12 md:py-16"
      style={{ backgroundImage: `url(${backgroundImage})` }}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-transparent" />
      <div className="relative z-10 max-w-2xl">
        <div className="mb-4 flex items-center gap-2 text-white/80">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
          <span className="type-body2 font-semibold uppercase tracking-wider">{eyebrow}</span>
        </div>
        <h1 className="type-h1 mb-4 text-white italic">{headline}</h1>
        <p className="type-body1 text-white/90">{subtext}</p>
      </div>
    </section>
  );
}
