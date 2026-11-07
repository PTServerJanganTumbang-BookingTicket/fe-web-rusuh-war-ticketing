import Link from "next/link";
import { CircleAlertIcon, CircleCheckIcon, MailIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/components/ui/cn.utils";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { AuthCard } from "@/components/ui/layout/AuthCard";
import { EventCover } from "@/components/ui/layout/EventCover";
import { SiteShell, type SiteShellProps } from "@/components/ui/layout/SiteShell";
import { ActionDialog, type ActionDialogProps } from "@/components/ui/layout/ActionDialog";

type LinkProps = { label: string; href: string };

export type BookingContextCard = { imageUrl: string; title: string; detail: string; note: string };

export type VerifyScreenProps =
  | {
      kind: "confirm";
      heading: string;
      message: string;
      /** Token baru dipakai saat ditekan, supaya pemindai email tidak menghanguskannya (ADR-0023 usulan 2). */
      confirm: { label: string; busy: boolean; onClick: () => void };
    }
  | {
      kind: "failed";
      heading: string;
      message: string;
      requestNew: LinkProps;
      /** Modal "Link login gagal" saat link sudah dipakai atau kedaluwarsa. */
      dialog?: ActionDialogProps;
    }
  | {
      kind: "done";
      heading: string;
      message: string;
      booking?: BookingContextCard;
      primary: LinkProps;
      secondary?: LinkProps;
    };

export type VerifyLoginViewProps = Omit<SiteShellProps, "children"> & VerifyScreenProps;

export function VerifyLoginView({ nav, footer, ...screen }: VerifyLoginViewProps) {
  return (
    <SiteShell nav={nav} footer={footer}>
      <VerifyScreen {...screen} />
      {screen.kind === "failed" && screen.dialog ? <ActionDialog {...screen.dialog} /> : null}
    </SiteShell>
  );
}

/** Navigasi tetap `<a>` (peran link), hanya bergaya tombol. */
function LinkButton({ link, variant = "default" }: { link: LinkProps; variant?: "default" | "outline" }) {
  return (
    <Link
      href={link.href}
      className={cn(
        buttonVariants({ variant, size: "lg" }),
        "w-full",
        variant === "outline" && "border-primary text-primary",
      )}
    >
      {link.label}
    </Link>
  );
}

function VerifyScreen(screen: VerifyScreenProps) {
  if (screen.kind === "failed") {
    return (
      <AuthCard tone="error" icon={<CircleAlertIcon />} title={screen.heading}>
        <Alert variant="destructive">
          <AlertDescription>{screen.message}</AlertDescription>
        </Alert>
        <LinkButton link={screen.requestNew} />
      </AuthCard>
    );
  }

  if (screen.kind === "confirm") {
    return (
      <AuthCard tone="info" icon={<MailIcon />} title={screen.heading} description={screen.message}>
        <Button
          size="lg"
          className="w-full"
          disabled={screen.confirm.busy}
          aria-busy={screen.confirm.busy}
          onClick={screen.confirm.onClick}
        >
          {screen.confirm.busy ? <Spinner data-icon="inline-start" /> : null}
          {screen.confirm.label}
        </Button>
      </AuthCard>
    );
  }

  return (
    <AuthCard tone="success" icon={<CircleCheckIcon />} title={screen.heading} description={screen.message}>
      {screen.booking ? (
        <Card className="gap-0 rounded-lg py-0">
          <EventCover src={screen.booking.imageUrl} className="aspect-[16/7]" />
          <CardContent className="flex flex-col gap-1 p-4">
            <p className="type-body1-bold">{screen.booking.title}</p>
            <p className="type-body2 text-muted-foreground">{screen.booking.detail}</p>
            <p className="type-body2 text-muted-foreground">{screen.booking.note}</p>
          </CardContent>
        </Card>
      ) : null}
      <LinkButton link={screen.primary} />
      {screen.secondary ? <LinkButton link={screen.secondary} variant="outline" /> : null}
    </AuthCard>
  );
}
