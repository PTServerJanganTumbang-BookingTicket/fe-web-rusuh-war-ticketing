"use client";

// Galeri katalog ActionDialog (docs/architecture/action-dialog.md): setiap dialog dibuka dengan aksi tiruan supaya
// desain dan perilaku mobile (sheet) bisa dicek tanpa memicu galat sungguhan. Bukan alur produk.

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ActionDialog } from "@/components/ui/layout/ActionDialog";
import { PageHeader } from "@/components/ui/layout/PageHeader";
import { SiteShell } from "@/components/ui/layout/SiteShell";
import { useModal, type ActionDialogModel } from "@/core/controllers/modal.hook";
import { useSiteChrome } from "@/core/controllers/site-chrome.hook";
import { t } from "@/core/i18n/t.utils";
import {
  toConnectionProblemDialog,
  toSessionExpiredDialog,
  toSomethingWentWrongDialog,
} from "@/core/controllers/common-dialogs.mapper";
import { toNikMismatchDialog, toNikUnavailableDialog } from "@/core/controllers/nik-dialog.mapper";
import {
  toAlreadyRegisteredDialog,
  toEmailVerificationFailedDialog,
  toLoginLinkFailedDialog,
  toRegistrationFailedDialog,
  toServiceUnavailableDialog,
} from "@/modules/auth/controllers/auth-dialogs.mapper";

type Entry = { id: string; group: string; build: (close: () => void) => ActionDialogModel };

const ENTRIES: Entry[] = [
  {
    id: "connection",
    group: "Umum",
    build: (close) => toConnectionProblemDialog({ onRetry: close, onDismiss: close }),
  },
  {
    id: "unknown",
    group: "Umum",
    build: (close) => toSomethingWentWrongDialog({ onRetry: close, onDismiss: close }),
  },
  { id: "sessionExpired", group: "Umum", build: (close) => toSessionExpiredDialog({ onDismiss: close }) },
  {
    id: "nikUnavailable",
    group: "NIK",
    build: (close) => toNikUnavailableDialog({ onRetry: close, onEdit: close, onDismiss: close }),
  },
  {
    id: "nikMismatch",
    group: "NIK",
    build: (close) => toNikMismatchDialog({ onEdit: close, onDismiss: close }),
  },
  {
    id: "serviceUnavailable",
    group: "Auth",
    build: (close) => toServiceUnavailableDialog({ onRetry: close, onDismiss: close }),
  },
  {
    id: "registrationFailed",
    group: "Auth",
    build: (close) => toRegistrationFailedDialog({ onRetry: close, onDismiss: close }),
  },
  {
    id: "alreadyRegistered",
    group: "Auth",
    build: (close) => toAlreadyRegisteredDialog({ onEdit: close, onDismiss: close }),
  },
  {
    id: "emailVerificationFailed",
    group: "Auth",
    build: (close) => toEmailVerificationFailedDialog({ onResend: close, onDismiss: close }),
  },
  { id: "loginLink", group: "Auth", build: (close) => toLoginLinkFailedDialog({ onDismiss: close }) },
  {
    id: "registerConfirm",
    group: "Auth",
    // Data sintetis untuk demo, bukan identitas sungguhan.
    build: (close) => ({
      tone: "info",
      icon: "mail",
      title: t("register.confirm.title"),
      description: t("register.confirm.description"),
      details: [
        { label: t("register.confirm.email"), value: "alex@example.com" },
        { label: t("register.confirm.nik"), value: "0000000000000000" },
      ],
      note: "Data demo sintetis, bukan identitas sungguhan.",
      primary: { label: t("register.confirm.submit"), onClick: close },
      secondary: { label: t("register.confirm.edit"), onClick: close },
      onDismiss: close,
    }),
  },
];

export default function DialogGalleryPage() {
  const { nav, footer } = useSiteChrome();
  const modal = useModal<{ kind: string }>();
  const open = ENTRIES.find((entry) => entry.id === modal.modal?.kind);
  const groups = [...new Set(ENTRIES.map((entry) => entry.group))];

  return (
    <SiteShell nav={nav} footer={footer}>
      <PageHeader
        breadcrumb={[{ label: "Signal demo", href: "/signal-demo" }, { label: "Dialog" }]}
        heading="Katalog ActionDialog"
        subtitle="Buka setiap dialog untuk mengecek desain. Di layar < 640px dialog tampil sebagai sheet yang bisa digeser ke bawah."
      />
      <div className="mt-8 grid gap-6 md:grid-cols-3">
        {groups.map((group) => (
          <Card key={group} className="rounded-2xl">
            <CardContent className="flex flex-col gap-3 p-6">
              <h2 className="type-h6">{group}</h2>
              {ENTRIES.filter((entry) => entry.group === group).map((entry) => (
                <Button
                  key={entry.id}
                  variant="outline"
                  className="justify-start"
                  onClick={() => modal.open({ kind: entry.id })}
                >
                  {entry.build(modal.close).title}
                </Button>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
      {open ? <ActionDialog {...open.build(modal.close)} /> : null}
    </SiteShell>
  );
}
