import type { ComponentProps } from "react";
import { cn } from "../cn.utils";

/** Field teks Signal DS. Tinggi 44px untuk target sentuh WebView; `aria-invalid` memberi garis galat. */
export function Input({ className, type = "text", ...props }: ComponentProps<"input">) {
  return (
    <input
      data-slot="input"
      type={type}
      className={cn(
        "type-body1 h-11 w-full rounded-md border border-input bg-card px-3 outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:bg-signal-disable aria-invalid:border-signal-error",
        className,
      )}
      {...props}
    />
  );
}
