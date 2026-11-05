"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { CircleAlertIcon, CircleCheckIcon, ClockIcon, InfoIcon, MailIcon } from "lucide-react";
import { Alert, AlertDescription } from "../alert";
import { Button, buttonVariants } from "../button";
import { cn } from "../cn.utils";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../dialog";
import { MOBILE_QUERY, useMediaQuery } from "../media-query.hook";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "../sheet";
import { Spinner } from "../spinner";

/** Aksi dialog: tombol (`onClick`) atau navigasi (`href`, tetap berperan link). */
export type ActionDialogAction =
  { label: string; onClick: () => void; busy?: boolean } | { label: string; href: string };

export type ActionDialogTone = "error" | "warning" | "info" | "success";
export type ActionDialogIcon = "alert" | "clock" | "mail" | "check" | "info";

export type ActionDialogProps = {
  /** Warna lingkaran ikon. `error` galat, `warning` sesi atau waktu, `info` tinjauan, `success` selesai. */
  tone: ActionDialogTone;
  /** Ikon di lingkaran; bawaan mengikuti `tone`. */
  icon?: ActionDialogIcon;
  title: string;
  description: string;
  /** Ringkasan isian, misalnya email dan NIK sebelum mendaftar. */
  details?: { label: string; value: string }[];
  /** Catatan kecil di bawah ringkasan atau penjelasan. */
  note?: string;
  /** Galat yang tidak menutup dialog, misalnya terlalu banyak permintaan. */
  error?: string;
  primary: ActionDialogAction;
  secondary?: ActionDialogAction;
  /** Escape, klik di luar, geser ke bawah (mobile), dan tombol tutup. Tidak dipanggil saat aksi utama berjalan. */
  onDismiss: () => void;
};

const TONE_CLASS: Record<ActionDialogTone, string> = {
  error: "bg-signal-bg-error text-signal-error",
  warning: "bg-signal-bg-warning text-signal-warning",
  info: "bg-signal-bg-info text-signal-info",
  success: "bg-signal-bg-valid text-signal-valid",
};

const TONE_ICON: Record<ActionDialogTone, ActionDialogIcon> = {
  error: "alert",
  warning: "clock",
  info: "info",
  success: "check",
};

const ICONS = {
  alert: CircleAlertIcon,
  clock: ClockIcon,
  mail: MailIcon,
  check: CircleCheckIcon,
  info: InfoIcon,
};

const actionClass = "h-12 w-full rounded-full text-base";

function ActionButton({ action, variant }: { action: ActionDialogAction; variant: "default" | "outline" }) {
  const outline = variant === "outline" ? "border-primary text-primary hover:text-primary" : undefined;
  if ("href" in action) {
    return (
      <Link href={action.href} className={cn(buttonVariants({ variant, size: "lg" }), actionClass, outline)}>
        {action.label}
      </Link>
    );
  }
  return (
    <Button
      variant={variant}
      size="lg"
      className={cn(actionClass, outline)}
      disabled={action.busy}
      aria-busy={action.busy}
      onClick={action.onClick}
    >
      {action.busy ? <Spinner data-icon="inline-start" /> : null}
      {action.label}
    </Button>
  );
}

function Body({ props, header }: { props: ActionDialogProps; header: ReactNode }) {
  const { tone, icon, details, note, error, primary, secondary } = props;
  const Icon = ICONS[icon ?? TONE_ICON[tone]];
  return (
    <>
      <span
        aria-hidden="true"
        className={cn(
          "flex size-16 items-center justify-center rounded-full [&_svg]:size-7",
          TONE_CLASS[tone],
        )}
      >
        <Icon />
      </span>
      {header}
      {details?.length ? (
        <dl className="flex flex-col gap-3 rounded-2xl border border-border p-4">
          {details.map((item) => (
            <div key={item.label} className="flex flex-col gap-0.5">
              <dt className="type-body2 text-muted-foreground">{item.label}</dt>
              <dd className="type-title break-all tabular-nums text-muted-foreground">{item.value}</dd>
            </div>
          ))}
          {note ? <p className="type-body2 text-muted-foreground">{note}</p> : null}
        </dl>
      ) : null}
      {!details?.length && note ? <p className="type-body2 text-muted-foreground">{note}</p> : null}
      {error ? (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <div className="flex flex-col gap-3">
        <ActionButton action={primary} variant="default" />
        {secondary ? <ActionButton action={secondary} variant="outline" /> : null}
      </div>
    </>
  );
}

/**
 * Dialog galat, peringatan, atau konfirmasi dengan satu aksi utama dan satu aksi cadangan opsional.
 * Mobile (< `sm`): bottom sheet yang bisa digeser ke bawah. Desktop: modal di tengah. Katalog dan aturan pemakaian
 * ada di `docs/architecture/action-dialog.md`.
 */
export function ActionDialog(props: ActionDialogProps) {
  const { tone, title, description, primary, onDismiss } = props;
  const mobile = useMediaQuery(MOBILE_QUERY);
  const busy = "onClick" in primary && Boolean(primary.busy);
  const onOpenChange = (open: boolean) => {
    if (!open && !busy) onDismiss();
  };
  const role = tone === "error" || tone === "warning" ? "alertdialog" : "dialog";

  if (mobile) {
    return (
      <Sheet open onOpenChange={onOpenChange}>
        <SheetContent role={role} showCloseButton={!busy} aria-busy={busy}>
          <Body
            props={props}
            header={
              <SheetHeader>
                <SheetTitle className="type-h5">{title}</SheetTitle>
                <SheetDescription className="type-body1 text-foreground">{description}</SheetDescription>
              </SheetHeader>
            }
          />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent
        role={role}
        showCloseButton={!busy}
        aria-busy={busy}
        className="gap-6 sm:max-w-lg sm:rounded-3xl sm:p-8"
      >
        <Body
          props={props}
          header={
            <DialogHeader className="gap-2">
              <DialogTitle className="type-h5">{title}</DialogTitle>
              <DialogDescription className="type-body1 text-foreground">{description}</DialogDescription>
            </DialogHeader>
          }
        />
      </DialogContent>
    </Dialog>
  );
}
