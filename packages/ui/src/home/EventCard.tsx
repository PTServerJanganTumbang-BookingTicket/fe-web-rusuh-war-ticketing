import { Badge, type BadgeProps } from "../primitives/Badge";
import { Button } from "../primitives/Button";
import { Card } from "../primitives/Card";
import { cn } from "../lib/cn";

export type EventCardProps = {
  id: string;
  name: string;
  /** Contoh: "25 Des 2026 · GBK" */
  meta: string;
  statusLabel: string;
  statusTone: "success" | "danger" | "info";
  cta: { label: string; /** Kosong berarti nonaktif (sold out atau belum dibuka). */ href?: string };
};

const badgeVariant: Record<EventCardProps["statusTone"], NonNullable<BadgeProps["variant"]>> = {
  success: "success",
  danger: "error",
  info: "info",
};

export function EventCard({ name, meta, statusLabel, statusTone, cta }: EventCardProps) {
  const available = cta.href !== undefined;
  return (
    <li>
      <Card className={cn("flex flex-col gap-2 p-4", !available && "bg-signal-disable")}>
        <div className="flex items-start justify-between gap-2">
          <h2 className="type-h6">{name}</h2>
          <Badge variant={badgeVariant[statusTone]}>{statusLabel}</Badge>
        </div>
        <p className="type-body1 text-muted-foreground">{meta}</p>
        {available ? (
          <Button asChild size="lg" className="mt-1 w-fit">
            <a href={cta.href}>{cta.label}</a>
          </Button>
        ) : (
          <Button size="lg" className="mt-1 w-fit" disabled>
            {cta.label}
          </Button>
        )}
      </Card>
    </li>
  );
}
