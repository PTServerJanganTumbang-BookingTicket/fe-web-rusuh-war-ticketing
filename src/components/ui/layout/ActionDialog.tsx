"use client";

import Link from "next/link";
import { CircleAlertIcon, CircleCheckIcon, InfoIcon } from "lucide-react";
import { Button, buttonVariants } from "../button";
import { cn } from "../cn.utils";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../dialog";
import { Spinner } from "../spinner";

/** Aksi dialog: tombol (`onClick`) atau navigasi (`href`, tetap berperan link). */
export type ActionDialogAction =
  { label: string; onClick: () => void; busy?: boolean } | { label: string; href: string };

export type ActionDialogProps = {
  tone: "error" | "info" | "success";
  title: string;
  description: string;
  primary: ActionDialogAction;
  secondary?: ActionDialogAction;
  /** Escape, klik di luar, dan tombol tutup. Tidak dipanggil saat aksi utama sedang berjalan. */
  onDismiss: () => void;
};

const toneIcon = {
  error: { icon: CircleAlertIcon, className: "bg-signal-bg-error text-signal-error" },
  info: { icon: InfoIcon, className: "bg-signal-bg-info text-signal-info" },
  success: { icon: CircleCheckIcon, className: "bg-signal-bg-valid text-signal-valid" },
} as const;

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

/**
 * Dialog galat atau konfirmasi dengan satu aksi utama dan satu aksi cadangan. Pola tampilan: ikon dalam lingkaran,
 * judul, penjelasan, lalu tombol penuh. Mobile: drawer bawah; desktop: modal di tengah (dari `DialogContent`).
 */
export function ActionDialog({ tone, title, description, primary, secondary, onDismiss }: ActionDialogProps) {
  const busy = "onClick" in primary && Boolean(primary.busy);
  const { icon: Icon, className } = toneIcon[tone];
  return (
    <Dialog open onOpenChange={(open) => !open && !busy && onDismiss()}>
      <DialogContent
        role={tone === "error" ? "alertdialog" : "dialog"}
        showCloseButton={!busy}
        aria-busy={busy}
        className="gap-6 sm:max-w-lg sm:rounded-3xl sm:p-8"
      >
        <span
          aria-hidden="true"
          className={cn("flex size-16 items-center justify-center rounded-full [&_svg]:size-7", className)}
        >
          <Icon />
        </span>
        <DialogHeader className="gap-2">
          <DialogTitle className="type-h5">{title}</DialogTitle>
          <DialogDescription className="type-body1 text-foreground">{description}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <ActionButton action={primary} variant="default" />
          {secondary ? <ActionButton action={secondary} variant="outline" /> : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
