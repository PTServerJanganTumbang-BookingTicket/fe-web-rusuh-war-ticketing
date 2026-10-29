import { ScreenFrame } from "./ScreenFrame";

export type ScreenPlaceholderProps = { title: string; description: string };

export function ScreenPlaceholder({ title, description }: ScreenPlaceholderProps) {
  return (
    <ScreenFrame title={title}>
      <p className="type-body1 py-4 text-center text-muted-foreground">{description}</p>
    </ScreenFrame>
  );
}
