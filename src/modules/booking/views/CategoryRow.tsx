import { MinusIcon, PlusIcon } from "@/components/ui/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/components/ui/cn.utils";

export type CategoryRowProps = {
  id: string;
  name: string;
  description: string;
  priceLabel: string;
  stockLabel: string;
  soldOut: boolean;
  quantity: number;
  canAdd: boolean;
  canRemove: boolean;
  addLabel: string;
  removeLabel: string;
  onAdd: () => void;
  onRemove: () => void;
};

/** Satu kategori tiket: harga, deskripsi, sisa stok, dan stepper jumlah (desain Detail Tiket). */
export function CategoryRow(props: CategoryRowProps) {
  const selected = props.quantity > 0;
  return (
    <li>
      <Card className={cn("gap-0 rounded-2xl py-0", selected && "ring-2 ring-primary")}>
        <CardContent className="flex flex-col gap-3 p-5 sm:p-6">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="type-h5">{props.name}</h3>
            <p className="type-h6 shrink-0 tabular-nums">{props.priceLabel}</p>
          </div>
          {props.description ? <p className="type-body1 text-muted-foreground">{props.description}</p> : null}
          <div className="flex items-center justify-between gap-3">
            <Badge
              className={cn(
                "type-body2 h-auto rounded-full px-3 py-0.5",
                props.soldOut
                  ? "bg-signal-bg-error text-signal-error"
                  : "bg-signal-bg-valid text-signal-valid",
              )}
            >
              {props.stockLabel}
            </Badge>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="rounded-full border-primary text-primary disabled:border-transparent"
                aria-label={props.removeLabel}
                disabled={!props.canRemove}
                onClick={props.onRemove}
              >
                <MinusIcon />
              </Button>
              <span className="type-title-bold w-5 text-center tabular-nums" aria-live="polite">
                {props.quantity}
              </span>
              <Button
                type="button"
                size="icon"
                className="rounded-full"
                aria-label={props.addLabel}
                disabled={!props.canAdd}
                onClick={props.onAdd}
              >
                <PlusIcon />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </li>
  );
}
