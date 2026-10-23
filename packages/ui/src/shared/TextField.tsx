import { useId, type ComponentProps } from "react";
import { Input } from "../primitives/Input";

export type TextFieldProps = Omit<ComponentProps<"input">, "onChange" | "value"> & {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  /** Menggantikan hint dan menandai field tidak valid (Figma: error di samping field). */
  error?: string;
  /** Penghitung karakter, mis. "12/16". */
  counter?: string;
};

/** Label + input + hint/error + penghitung. Hint dan error dihubungkan lewat aria-describedby. */
export function TextField({ label, value, onChange, hint, error, counter, ...inputProps }: TextFieldProps) {
  const id = useId();
  const hintId = useId();
  const message = error ?? hint;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="type-title">
        {label}
      </label>
      <Input
        id={id}
        value={value}
        aria-invalid={error ? true : undefined}
        aria-describedby={message ? hintId : undefined}
        onChange={(event) => onChange(event.target.value)}
        {...inputProps}
      />
      {message || counter ? (
        <div className="flex items-start justify-between gap-3">
          {message ? (
            <p id={hintId} className={error ? "type-body2 text-signal-error" : "type-body2 text-muted-foreground"}>
              {message}
            </p>
          ) : (
            <span />
          )}
          {counter ? <span className="type-body2 shrink-0 text-muted-foreground">{counter}</span> : null}
        </div>
      ) : null}
    </div>
  );
}
