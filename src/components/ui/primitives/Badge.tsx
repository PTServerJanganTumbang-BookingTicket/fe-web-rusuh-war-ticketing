import type { ComponentProps } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../cn.utils";

export const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border border-transparent px-3 py-0.5 text-xs font-semibold whitespace-nowrap [&>svg]:size-3",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground",
        secondary: "bg-secondary text-secondary-foreground",
        outline: "border-border text-foreground",
        success: "bg-signal-bg-valid text-signal-valid",
        info: "bg-signal-bg-info text-signal-info",
        warning: "bg-signal-bg-warning text-signal-warning",
        error: "bg-signal-bg-error text-signal-error",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export type BadgeProps = ComponentProps<"span"> & VariantProps<typeof badgeVariants>;

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />;
}
