import type { ComponentProps } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../cn";

const alertVariants = cva("w-full rounded-lg border px-4 py-3 text-sm", {
  variants: {
    variant: {
      info: "border-signal-info/30 bg-signal-bg-info text-signal-info",
      success: "border-signal-valid/30 bg-signal-bg-valid text-signal-valid",
      warning: "border-signal-warning/30 bg-signal-bg-warning text-signal-warning",
      error: "border-signal-error/30 bg-signal-bg-error text-signal-error",
    },
  },
  defaultVariants: { variant: "info" },
});

export type AlertProps = ComponentProps<"div"> & VariantProps<typeof alertVariants>;

/** `role` default `status`; pakai `role="alert"` untuk kesalahan yang perlu segera diumumkan. */
export function Alert({ className, variant, role = "status", ...props }: AlertProps) {
  return (
    <div data-slot="alert" role={role} className={cn(alertVariants({ variant }), className)} {...props} />
  );
}
