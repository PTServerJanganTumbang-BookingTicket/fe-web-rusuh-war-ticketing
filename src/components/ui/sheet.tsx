"use client";

import * as React from "react";
import { Drawer as DrawerPrimitive } from "@base-ui/react/drawer";
import { XIcon } from "lucide-react";
import { cn } from "./cn.utils";
import { Button } from "./button";

/**
 * Bottom sheet mobile di atas Base UI Drawer: geser ke bawah untuk menutup, fokus terkunci, Escape menutup,
 * dan fokus kembali ke pemicu. Dipakai `ActionDialog` di bawah breakpoint `sm`.
 */
function Sheet(props: DrawerPrimitive.Root.Props) {
  return <DrawerPrimitive.Root data-slot="sheet" swipeDirection="down" {...props} />;
}

function SheetContent({
  className,
  children,
  showCloseButton = true,
  closeLabel = "Tutup",
  ...props
}: DrawerPrimitive.Popup.Props & { showCloseButton?: boolean; closeLabel?: string }) {
  return (
    <DrawerPrimitive.Portal>
      <DrawerPrimitive.Backdrop
        data-slot="sheet-backdrop"
        className="fixed inset-0 isolate z-50 min-h-dvh bg-black/80 opacity-[calc(1_-_var(--drawer-swipe-progress,0))] supports-backdrop-filter:backdrop-blur-xs transition-opacity duration-[450ms] ease-[cubic-bezier(0.32,0.72,0,1)] data-ending-style:opacity-0 data-ending-style:duration-[calc(var(--drawer-swipe-strength)*400ms)] data-starting-style:opacity-0 data-swiping:duration-0"
      />
      <DrawerPrimitive.Viewport data-slot="sheet-viewport" className="fixed inset-0 z-50 flex items-end">
        <DrawerPrimitive.Popup
          data-slot="sheet-content"
          className={cn(
            "relative flex max-h-[92dvh] w-full flex-col gap-6 overflow-y-auto overscroll-contain rounded-t-3xl bg-popover px-6 pt-3 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-sm text-popover-foreground shadow-2xl outline-none [transform:translateY(var(--drawer-swipe-movement-y))] transition-transform duration-[450ms] ease-[cubic-bezier(0.32,0.72,0,1)] data-ending-style:[transform:translateY(100%)] data-ending-style:duration-[calc(var(--drawer-swipe-strength)*400ms)] data-starting-style:[transform:translateY(100%)] data-swiping:select-none",
            className,
          )}
          {...props}
        >
          {/* Pegangan geser: dekoratif, gestur geser berlaku di seluruh sheet. */}
          <span aria-hidden="true" className="mx-auto h-1.5 w-12 shrink-0 rounded-full bg-border" />
          <DrawerPrimitive.Content className="flex flex-col gap-6">{children}</DrawerPrimitive.Content>
          {showCloseButton ? (
            <DrawerPrimitive.Close
              data-slot="sheet-close"
              render={<Button variant="ghost" size="icon-sm" className="absolute top-4 right-4" />}
            >
              <XIcon />
              <span className="sr-only">{closeLabel}</span>
            </DrawerPrimitive.Close>
          ) : null}
        </DrawerPrimitive.Popup>
      </DrawerPrimitive.Viewport>
    </DrawerPrimitive.Portal>
  );
}

function SheetTitle({ className, ...props }: DrawerPrimitive.Title.Props) {
  return (
    <DrawerPrimitive.Title data-slot="sheet-title" className={cn("font-semibold", className)} {...props} />
  );
}

function SheetDescription({ className, ...props }: DrawerPrimitive.Description.Props) {
  return (
    <DrawerPrimitive.Description
      data-slot="sheet-description"
      className={cn("text-muted-foreground", className)}
      {...props}
    />
  );
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="sheet-header" className={cn("flex flex-col gap-2", className)} {...props} />;
}

export { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle };
