import type { ComponentProps, ReactNode } from "react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { cn } from "../lib/cn";

export type DialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  /** false saat proses berjalan: Escape dan klik luar tidak menutup (Figma: "Disabled blocks pointer and keyboard"). */
  dismissible?: boolean;
} & Pick<ComponentProps<"div">, "className">;

/**
 * Modal di desktop, bottom sheet di mobile (Figma: "Desktop modal + mobile bottom sheet"). Radix menjebak fokus,
 * menutup dengan Escape, dan mengembalikan fokus ke pemicu.
 */
export function Dialog({ open, onOpenChange, title, description, children, dismissible = true, className }: DialogProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={(next) => (dismissible || next ? onOpenChange(next) : undefined)}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-foreground/50" />
        <DialogPrimitive.Content
          className={cn(
            "fixed z-50 flex flex-col gap-4 bg-card p-5 shadow-lg outline-none",
            "inset-x-0 bottom-0 max-h-[90dvh] overflow-y-auto rounded-t-2xl pb-[max(1.25rem,env(safe-area-inset-bottom))]",
            "sm:inset-auto sm:top-1/2 sm:left-1/2 sm:w-full sm:max-w-[520px] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl",
            className,
          )}
        >
          <div>
            <DialogPrimitive.Title className="type-h5">{title}</DialogPrimitive.Title>
            {description ? (
              <DialogPrimitive.Description className="type-body1 mt-1 text-muted-foreground">{description}</DialogPrimitive.Description>
            ) : (
              <DialogPrimitive.Description className="sr-only">{title}</DialogPrimitive.Description>
            )}
          </div>
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
