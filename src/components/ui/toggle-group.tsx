"use client";

import { Toggle as TogglePrimitive } from "@base-ui/react/toggle";
import { ToggleGroup as ToggleGroupPrimitive } from "@base-ui/react/toggle-group";
import type { VariantProps } from "class-variance-authority";
import { buttonVariants } from "./button";
import { cn } from "cn";

function ToggleGroup({ className, ...props }: ToggleGroupPrimitive.Props) {
  return <ToggleGroupPrimitive data-slot="toggle-group" className={cn("flex", className)} {...props} />;
}

/** Tombol dua keadaan (`aria-pressed`) dengan gaya `Button`; pilih varian `toggle` atau `segment`. */
function ToggleGroupItem({
  className,
  variant = "toggle",
  size = "lg",
  ...props
}: TogglePrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <TogglePrimitive
      data-slot="toggle-group-item"
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { ToggleGroup, ToggleGroupItem };
