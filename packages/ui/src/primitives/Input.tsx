import type { ComponentProps } from "react";
import { cn } from "../lib/cn";

export type InputProps = ComponentProps<"input">;

/** Field teks Signal. Status galat lewat `aria-invalid`, sehingga warna dan pembaca layar memakai sumber yang sama. */
export function Input({ className, ...props }: InputProps) {
  return (
    <input
      data-slot="input"
      className={cn(
        "h-12 w-full rounded-md border border-input bg-card px-3 text-base text-foreground outline-none transition-[color,box-shadow]",
        "placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
        "disabled:cursor-not-allowed disabled:bg-signal-disable disabled:text-signal-text-disable",
        "aria-invalid:border-signal-error aria-invalid:ring-signal-error/20",
        className,
      )}
      {...props}
    />
  );
}
