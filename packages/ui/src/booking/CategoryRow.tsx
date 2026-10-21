import { Minus, Plus } from "lucide-react";
import { Badge } from "../primitives/Badge";
import { Button } from "../primitives/Button";
import { Card } from "../primitives/Card";
import { cn } from "../lib/cn";

export type CategoryRowProps = {
  id: string;
  name: string;
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

export function CategoryRow(props: CategoryRowProps) {
  const selected = props.quantity > 0;
  return (
    <li>
      <Card className={cn("flex flex-col gap-3 p-4", selected ? "border-primary bg-accent" : props.soldOut && "bg-signal-disable")}>
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="type-h6">{props.name}</h3>
          <p className="type-title-bold">{props.priceLabel}</p>
        </div>
        <div className="flex items-center justify-between gap-2">
          <Badge variant={props.soldOut ? "error" : "success"}>{props.stockLabel}</Badge>
          <div className="flex items-center gap-4">
            <Button type="button" variant="outline" size="icon-lg" aria-label={props.removeLabel} disabled={!props.canRemove} onClick={props.onRemove}>
              <Minus />
            </Button>
            <span className="type-title-bold w-4 text-center" aria-live="polite">
              {props.quantity}
            </span>
            <Button type="button" size="icon-lg" aria-label={props.addLabel} disabled={!props.canAdd} onClick={props.onAdd}>
              <Plus />
            </Button>
          </div>
        </div>
      </Card>
    </li>
  );
}
