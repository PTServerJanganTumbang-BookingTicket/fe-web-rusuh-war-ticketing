import { Alert } from "@/ui/design-system/primitives/Alert";
import { Button } from "@/ui/design-system/primitives/Button";
import { Card } from "@/ui/design-system/primitives/Card";
import { CountdownCard, type CountdownCardProps } from "@/ui/design-system/layout/CountdownCard";
import { ScreenFrame } from "@/ui/design-system/layout/ScreenFrame";
import { CategoryRow, type CategoryRowProps } from "./CategoryRow";

export type BookingViewProps = {
  eventName: string;
  headerTimerLabel: string;
  countdown: CountdownCardProps;
  nik: { label: string; maskedValue: string; hint: string };
  categoriesLabel: string;
  quotaNotice?: string;
  categories: CategoryRowProps[];
  total: { label: string; value: string };
  submit: { label: string; disabled: boolean; onClick: () => void };
};

export function BookingView(props: BookingViewProps) {
  return (
    <ScreenFrame title={props.eventName} trailing={props.headerTimerLabel}>
      <CountdownCard {...props.countdown} />

      <Card className="p-5">
        <h2 className="type-title-bold">{props.nik.label}</h2>
        <p
          aria-label={props.nik.label}
          className="type-title mt-3 rounded-md border bg-signal-disable px-4 py-2.5 tracking-wider"
        >
          {props.nik.maskedValue}
        </p>
        <p className="type-body2 mt-2 text-muted-foreground">{props.nik.hint}</p>
      </Card>

      <h2 className="type-body1 text-muted-foreground">{props.categoriesLabel}</h2>
      {props.quotaNotice ? <Alert variant="warning">{props.quotaNotice}</Alert> : null}
      <ul className="flex flex-col gap-3">
        {props.categories.map((category) => (
          <CategoryRow key={category.id} {...category} />
        ))}
      </ul>

      <div className="type-title-bold flex items-baseline justify-between">
        <span>{props.total.label}</span>
        <span>{props.total.value}</span>
      </div>
      <Button size="lg" className="w-fit" onClick={props.submit.onClick} disabled={props.submit.disabled}>
        {props.submit.label}
      </Button>
    </ScreenFrame>
  );
}
