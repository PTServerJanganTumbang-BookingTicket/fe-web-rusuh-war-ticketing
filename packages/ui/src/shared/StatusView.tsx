import { Button } from "../primitives/Button";
import { ScreenFrame } from "./ScreenFrame";

export type StatusViewProps = {
  title: string;
  message: string;
  tone: "neutral" | "error";
  action?: { label: string; onClick: () => void };
};

export function StatusView({ title, message, tone, action }: StatusViewProps) {
  return (
    <ScreenFrame title={title} tone={tone === "error" ? "danger" : "default"}>
      <div role="status" aria-live="polite" className="flex flex-col items-center gap-4 py-4 text-center">
        <p className="type-body1 text-muted-foreground">{message}</p>
        {action ? (
          <Button variant="outline" size="lg" onClick={action.onClick}>
            {action.label}
          </Button>
        ) : null}
      </div>
    </ScreenFrame>
  );
}
