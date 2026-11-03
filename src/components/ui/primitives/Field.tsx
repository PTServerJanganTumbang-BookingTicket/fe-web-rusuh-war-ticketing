import type { ReactNode } from "react";
import { cn } from "../cn.utils";

export type FieldProps = {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  className?: string;
  /** Kontrol yang diberi `id`, `aria-describedby`, dan `aria-invalid` oleh pemanggil. */
  children: ReactNode;
};

/** Label, petunjuk, dan pesan galat untuk satu kontrol form. Galat dihubungkan lewat `${id}-error`. */
export function Field({ id, label, hint, error, className, children }: FieldProps) {
  return (
    <div data-slot="field" className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="type-body2 font-semibold">
        {label}
      </label>
      {children}
      {hint && !error ? (
        <p id={`${id}-hint`} className="type-body2 text-muted-foreground">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} role="alert" className="type-body2 text-signal-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Nilai `aria-describedby` untuk kontrol di dalam `Field`. */
export function describedBy(id: string, { hint, error }: { hint?: string; error?: string }) {
  if (error) return `${id}-error`;
  return hint ? `${id}-hint` : undefined;
}
