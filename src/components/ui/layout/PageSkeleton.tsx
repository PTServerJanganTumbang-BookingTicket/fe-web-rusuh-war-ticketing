import type { JSX } from "react";
import { Card, CardContent } from "../card";
import { Skeleton } from "../skeleton";
import { BrandShell } from "./BrandShell";

/**
 * Bentuk kerangka mengikuti tata letak layar yang akan tampil, supaya isi tidak melompat saat data datang.
 * `page` umum, `list` kartu event atau tiket, `checkout` Detail Ticket dan Payment (isi + ringkasan samping),
 * `ticket` e-tiket (info + QR), `profile` profil dan alias, `queue` Waiting Room.
 */
export type SkeletonVariant = "page" | "list" | "checkout" | "ticket" | "profile" | "queue";

export type PageSkeletonProps = {
  /** Diumumkan pembaca layar (role="status"); tidak terlihat. */
  label: string;
  variant?: SkeletonVariant;
  /** `false` bila layar sudah merender `PageHeader` sendiri. */
  withHeader?: boolean;
};

function HeaderSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-9 w-3/4 max-w-md" />
      <Skeleton className="h-5 w-2/3 max-w-lg" />
    </div>
  );
}

function CardSkeleton({ lines = 3, media = false }: { lines?: number; media?: boolean }) {
  return (
    <Card className="gap-0 overflow-hidden rounded-2xl py-0">
      {media ? <Skeleton className="aspect-[16/9] w-full rounded-none" /> : null}
      <CardContent className="flex flex-col gap-3 p-5">
        <Skeleton className="h-6 w-2/3" />
        {Array.from({ length: lines }, (_, index) => (
          <Skeleton key={index} className={index === lines - 1 ? "h-4 w-1/2" : "h-4 w-full"} />
        ))}
      </CardContent>
    </Card>
  );
}

/** Kartu event atau tiket; juga dipakai daftar yang sudah punya header sendiri (Home, Tiket Saya). */
export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }, (_, index) => (
        <CardSkeleton key={index} media lines={2} />
      ))}
    </div>
  );
}

function ListBody() {
  return <CardGridSkeleton />;
}

function CheckoutBody() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-16 w-full rounded-xl" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-8">
        <div className="flex flex-col gap-6">
          <CardSkeleton lines={4} />
          <CardSkeleton lines={3} />
        </div>
        <div className="flex flex-col gap-6">
          <CardSkeleton media lines={2} />
          <CardSkeleton lines={4} />
          <Skeleton className="h-12 w-full rounded-full" />
        </div>
      </div>
    </div>
  );
}

function TicketBody() {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-8">
      <CardSkeleton media lines={5} />
      <Card className="rounded-2xl">
        <CardContent className="flex flex-col items-center gap-4 p-6">
          <Skeleton className="aspect-square w-full max-w-64 rounded-xl" />
          <Skeleton className="h-4 w-1/2" />
        </CardContent>
      </Card>
    </div>
  );
}

function ProfileBody() {
  return (
    <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)] lg:gap-8">
      <Card className="gap-0 overflow-hidden rounded-2xl py-0">
        <div className="flex flex-col items-center gap-3 px-6 pt-8 pb-6">
          <Skeleton className="size-20 rounded-full" />
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-48" />
        </div>
        <CardContent className="flex flex-col gap-3 p-6">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="h-10 w-full" />
          ))}
          <Skeleton className="h-12 w-full rounded-full" />
        </CardContent>
      </Card>
      <Card className="rounded-2xl">
        <CardContent className="flex flex-col gap-4 p-6">
          <Skeleton className="h-6 w-48" />
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 2 }, (_, index) => (
              <div key={index} className="flex items-center gap-3 rounded-xl border border-border p-4">
                <Skeleton className="size-11 rounded-full" />
                <div className="flex flex-1 flex-col gap-2">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </div>
            ))}
          </div>
          <Skeleton className="h-40 w-full rounded-xl" />
        </CardContent>
      </Card>
    </div>
  );
}

function QueueBody() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <Card className="rounded-2xl">
        <CardContent className="flex flex-col items-center gap-4 p-6 sm:p-10">
          <Skeleton className="h-6 w-28 rounded-full" />
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-14 w-48" />
          <Skeleton className="h-5 w-56" />
          <Skeleton className="mt-4 h-16 w-full rounded-xl" />
        </CardContent>
      </Card>
      <CardSkeleton lines={2} />
    </div>
  );
}

function PageBody() {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-8">
      <div className="flex flex-col gap-4">
        <CardSkeleton lines={3} />
        <CardSkeleton lines={3} />
      </div>
      <CardSkeleton lines={4} />
    </div>
  );
}

const BODY: Record<SkeletonVariant, () => JSX.Element> = {
  page: PageBody,
  list: ListBody,
  checkout: CheckoutBody,
  ticket: TicketBody,
  profile: ProfileBody,
  queue: QueueBody,
};

/** Kerangka isi halaman (tanpa navbar). Dipakai di dalam `SiteShell` atau lewat `ScreenLoading`. */
export function PageSkeleton({ label, variant = "page", withHeader = true }: PageSkeletonProps) {
  const Body = BODY[variant];
  return (
    <div role="status" aria-live="polite" aria-busy="true" className="flex flex-col gap-6 sm:gap-8">
      <span className="sr-only">{label}</span>
      {withHeader && variant !== "queue" ? <HeaderSkeleton /> : null}
      <Body />
    </div>
  );
}

/**
 * Fallback Suspense dan render pertama: header merek dan kerangka isi, tanpa menu (status masuk belum diketahui).
 * Props-only; teks `label` dari i18n disediakan pemanggil di `app/` atau Container.
 */
export function ScreenLoading(props: PageSkeletonProps) {
  return (
    <BrandShell>
      <PageSkeleton {...props} />
    </BrandShell>
  );
}
