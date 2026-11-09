import Image from "next/image";
import Link from "next/link";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/components/ui/cn.utils";
import { ArrowRightIcon, CalendarIcon } from "@/components/ui/icons";

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
      <Card className="gap-0 overflow-hidden rounded-xl py-0 transition-shadow hover:shadow-lg">
        <div className="relative aspect-[4/3] overflow-hidden">
          <Image
            src={imageUrl || "/images/concert-placeholder.webp"}
            alt={name}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
          <Badge
            variant={badgeVariant[statusTone]}
            className="absolute left-3 top-3 h-6 px-3 text-xs font-semibold"
          >
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
            <CalendarIcon aria-hidden="true" className="size-3.5 shrink-0" />
            <span>
              {date} · {venue}
            </span>
          </div>
          {available ? (
            <Link href={cta.href!} className={cn(buttonVariants({ size: "lg" }), "w-full")}>
              {cta.label}
              <ArrowRightIcon aria-hidden="true" className="size-3.5 -rotate-45" />
            </Link>
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
