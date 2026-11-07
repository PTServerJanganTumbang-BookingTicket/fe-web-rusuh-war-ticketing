import { cn } from "./cn.utils";

/** Blok abu-abu berdenyut pengganti isi yang sedang dimuat. Dekoratif: status memuat diumumkan pembungkusnya. */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      aria-hidden="true"
      data-slot="skeleton"
      className={cn("animate-pulse rounded-md bg-signal-disable motion-reduce:animate-none", className)}
      {...props}
    />
  );
}

export { Skeleton };
