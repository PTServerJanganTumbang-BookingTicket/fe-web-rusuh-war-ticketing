import Image from "next/image";
import Link from "next/link";
import { Badge, type BadgeProps } from "@/components/ui/primitives/Badge";
import { Button } from "@/components/ui/primitives/Button";
import { Card } from "@/components/ui/primitives/Card";

export type EventCardProps = {
  id: string;
  name: string;
  imageUrl: string;
  location: string;
  category: string;
  date: string;
  venue: string;
  statusLabel: string;
  statusTone: "success" | "danger" | "info";
  cta: { label: string; href?: string };
};

const badgeVariant: Record<EventCardProps["statusTone"], NonNullable<BadgeProps["variant"]>> = {
  success: "success",
  danger: "error",
  info: "info",
};

export function EventCard({
  name,
  imageUrl,
  location,
  category,
  date,
  venue,
  statusLabel,
  statusTone,
  cta,
}: EventCardProps) {
  const available = cta.href !== undefined;

  return (
    <article className="group">
      <Card className="overflow-hidden p-0 transition-shadow hover:shadow-lg">
        <div className="relative aspect-[4/3] overflow-hidden">
          <Image
            src={imageUrl || "/images/concert-placeholder.webp"}
            alt={name}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
          <Badge variant={badgeVariant[statusTone]} className="absolute left-3 top-3">
            {statusLabel}
          </Badge>
        </div>
        <div className="p-4">
          <div className="mb-2 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-primary">
            <span>{location}</span>
            <span>·</span>
            <span>{category}</span>
          </div>
          <h3 className="type-h6 mb-2 text-foreground">{name}</h3>
          <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <span>
              {date} · {venue}
            </span>
          </div>
          {available ? (
            <Button asChild className="w-full" size="lg">
              <Link href={cta.href!}>
                {cta.label}
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
                  <line x1="7" y1="17" x2="17" y2="7" />
                  <polyline points="7 7 17 7 17 17" />
                </svg>
              </Link>
            </Button>
          ) : (
            <Button disabled className="w-full" size="lg" variant="outline" aria-disabled="true">
              {cta.label}
            </Button>
          )}
        </div>
      </Card>
    </article>
  );
}
