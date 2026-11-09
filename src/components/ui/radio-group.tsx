"use client";

import { Radio as RadioPrimitive } from "@base-ui/react/radio";
import { RadioGroup as RadioGroupPrimitive } from "@base-ui/react/radio-group";
import { cn } from "cn";

function RadioGroup({ className, ...props }: RadioGroupPrimitive.Props) {
  return (
    <RadioGroupPrimitive
      data-slot="radio-group"
      className={cn("flex w-full flex-col gap-3", className)}
      {...props}
    />
  );
}

/** Lingkaran radio saja. Bungkus dengan `<label>` bila perlu kartu yang bisa diklik penuh. */
function RadioGroupItem({ className, ...props }: RadioPrimitive.Root.Props) {
  return (
    <RadioPrimitive.Root
      data-slot="radio-group-item"
      className={cn(
        "relative flex size-5 shrink-0 items-center justify-center rounded-full border-2 border-input outline-none transition-colors",
        "after:absolute after:-inset-2 focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50",
        "data-checked:border-primary aria-invalid:border-destructive",
        className,
      )}
      {...props}
    >
      <RadioPrimitive.Indicator
        data-slot="radio-group-indicator"
        className="size-2.5 rounded-full bg-primary"
      />
    </RadioPrimitive.Root>
  );
}

export { RadioGroup, RadioGroupItem };
