import { NIK_LENGTH } from "@/core/domain/nik.utils";
import type { SessionAccount } from "@/core/domain/session-account.model";
import { COUNTDOWN_URGENT_AT_MS } from "@/core/domain/time/countdown.constants";
import { formatMmSs } from "@/core/domain/time/format-mm-ss.utils";
import { formatIdr } from "@/core/controllers/format-currency.utils";
import type { SiteChrome } from "@/core/controllers/site-chrome.utils";
import { intlLocale } from "@/core/i18n/locale.utils";
import { t, type MessageKey } from "@/core/i18n/t.utils";
import type { BookingEvent } from "../domain/booking-event.model";
import type { NikCheck } from "../domain/booking-request.model";
import type { BookingSession } from "../domain/booking-session.model";
import { canAddTicket } from "../domain/can-add-ticket.rules";
import { selectedCount, totalPriceIdr, type Selection } from "../domain/selection.reducer";
import { duplicateNikSlots, isEmail, isNikFormat, ticketSlots } from "../domain/ticket-slots.rules";
import type { HolderAlias } from "../domain/holder-alias.model";
import { aliasOptionsFor, OWNER_HOLDER_ID } from "../domain/ticket-holders.rules";
import type { BookingViewProps, TicketHolderProps } from "../views/BookingView";
import type { ActionDialogModel } from "@/core/controllers/modal.hook";

/** Bulan singkat mengikuti bahasa aktif. */
const eventDate = () =>
  new Intl.DateTimeFormat(intlLocale(), { day: "2-digit", month: "short", year: "numeric" });

/** Status cek NIK per slot. `nik` dicatat supaya hasil untuk NIK lama tidak dipakai setelah diketik ulang. */
export type NikCheckState =
  | { nik: string; state: "checking" }
  | { nik: string; state: "done"; result: NikCheck }
  | { nik: string; state: "failed" };

export type BookingForm = {
  contactEmail: string;
  niks: Readonly<Record<string, string>>;
  /** Slot yang pemegangnya alias: kunci slot → id alias. NIK alias tetap ada di `niks`. */
  aliasPicks?: Readonly<Record<string, string>>;
  checks: Readonly<Record<string, NikCheckState>>;
  /** Galat bentuk baru tampil setelah field ditinggalkan atau form dikirim. */
  touched: ReadonlySet<string>;
  submitted: boolean;
};

export type BookingViewInput = {
  chrome: SiteChrome;
  eventId: string;
  session: BookingSession;
  event?: BookingEvent;
  selection: Selection;
  remainingMs: number;
  form: BookingForm;
  submitting: boolean;
  error?: string;
  /** Modal verifikasi NIK yang sedang terbuka. */
  dialog?: ActionDialogModel;
  /** Slot yang field NIK-nya diberi fokus; `n` berubah tiap permintaan. */
  focusNik?: { slotKey: string; n: number } | null;
  onAdd: (categoryId: string) => void;
  onRemove: (categoryId: string) => void;
  onContactEmail: (value: string) => void;
  onNik: (slotKey: string, value: string) => void;
  onNikBlur: (slotKey: string) => void;
  /** Alias akun yang bisa dipilih. Kosong untuk tamu. */
  aliases?: readonly HolderAlias[];
  /** `aliasId` kosong berarti kembali ke isian NIK manual. */
  onHolderAlias?: (slotKey: string, aliasId: string) => void;
  /** Akun yang masuk; `null` atau kosong untuk tamu. Email pemesan terisi dari akun dan pilihan pemegang selalu tampil. */
  account?: SessionAccount | null;
  /** Cek NIK yang diketik ke Dukcapil lewat tombol, bukan hanya saat field ditinggalkan. */
  onNikVerify?: (slotKey: string) => void;
  onFieldBlur: (field: string) => void;
  onSubmit: () => void;
};

const checkMessages: Record<Exclude<NikCheck["status"], "valid">, MessageKey> = {
  not_found: "booking.holder.nik.not_found",
  inactive: "booking.holder.nik.inactive",
  used: "booking.holder.nik.used",
};

/** Galat NIK satu slot, urut dari yang paling mendasar. Hasil cek Dukcapil hanya dipakai untuk NIK yang sama. */
export function nikError(
  nik: string,
  { show, duplicate, check }: { show: boolean; duplicate: boolean; check?: NikCheckState },
): string | undefined {
  if (show && !isNikFormat(nik)) return t("booking.holder.nik.invalid");
  if (duplicate) return t("booking.holder.nik.duplicate");
  if (check?.nik !== nik) return undefined;
  if (check.state === "failed") return t("booking.holder.nik.error");
  if (check.state === "done" && check.result.status !== "valid") return t(checkMessages[check.result.status]);
  return undefined;
}

/** Form siap dikirim: email pemesan valid, tiap tiket punya NIK unik berformat benar, dan tidak ada NIK yang ditolak. */
export function isBookingFormValid(form: BookingForm, slotKeys: string[]): boolean {
  if (slotKeys.length === 0 || !isEmail(form.contactEmail)) return false;
  const niks = Object.fromEntries(slotKeys.map((key) => [key, form.niks[key] ?? ""]));
  const duplicates = duplicateNikSlots(niks);
  return slotKeys.every((key) => {
    const nik = niks[key] ?? "";
    const check = form.checks[key];
    const rejected = check?.nik === nik && check.state === "done" && check.result.status !== "valid";
    return isNikFormat(nik) && !duplicates.has(key) && !rejected;
  });
}

export function toBookingViewProps(input: BookingViewInput): BookingViewProps {
  const { session, event, selection, form, remainingMs } = input;
  const count = selectedCount(selection);
  const stock = Object.fromEntries(session.categories.map((category) => [category.id, category.stock]));
  const max = session.quota.max;
  const slots = ticketSlots(selection, session.categories);
  const niks = Object.fromEntries(slots.map((slot) => [slot.key, form.niks[slot.key] ?? ""]));
  const duplicates = duplicateNikSlots(niks);
  const eventTitle = event
    ? t("checkout.event.name", { name: event.name, city: event.city })
    : session.eventName;
  const show = (field: string) => form.submitted || form.touched.has(field);

  const account = input.account ?? null;
  const aliases = input.aliases ?? [];
  const holderOptionLabel = (alias: HolderAlias, taken: boolean) => {
    if (alias.id === OWNER_HOLDER_ID)
      return t(taken ? "booking.holder.source.ownerTaken" : "booking.holder.source.owner", {
        nik: alias.nikMasked,
      });
    const key = taken ? "booking.holder.source.taken" : "booking.holder.source.alias";
    return t(key, { label: alias.label, nik: alias.nikMasked });
  };

  const holders: TicketHolderProps[] = slots.map((slot) => {
    const nik = niks[slot.key] ?? "";
    const check = form.checks[slot.key];
    const error = nikError(nik, {
      show: show(`nik:${slot.key}`),
      duplicate: duplicates.has(slot.key),
      check,
    });
    const verified = check?.nik === nik && check.state === "done" && check.result.status === "valid";
    let success: string | undefined;
    if (verified && check.result.status === "valid")
      success = t("booking.holder.nik.valid", { name: check.result.name });
    else if (check?.nik === nik && check.state === "checking") success = t("booking.holder.nik.checking");
    const pickedId = form.aliasPicks?.[slot.key];
    const picked = aliases.find((alias) => alias.id === pickedId);
    const checking = check?.nik === nik && check.state === "checking";
    // Satu judul per kategori ("Normal × 2"), bukan "Normal × 1" yang berulang untuk tiap tiket.
    const firstOfCategory =
      slots.findIndex((other) => other.categoryId === slot.categoryId) === slots.indexOf(slot);
    const quantity = slots.filter((other) => other.categoryId === slot.categoryId).length;
    return {
      id: slot.key,
      heading: firstOfCategory
        ? {
            title: t("checkout.summary.line", { category: slot.categoryName, count: quantity }),
            priceLabel: t("checkout.summary.each", { price: formatIdr(slot.priceIdr) }),
          }
        : undefined,
      nik: {
        label: t("booking.holder.nik.label", { number: slot.number }),
        placeholder: t("booking.holder.nik.placeholder"),
        // NIK alias ditampilkan tersamar; nilai lengkapnya hanya dikirim ke server.
        value: picked ? picked.nikMasked : nik,
        readOnly: Boolean(picked),
        maxLength: NIK_LENGTH,
        focusKey: input.focusNik?.slotKey === slot.key ? input.focusNik.n : undefined,
        error,
        success: error ? undefined : success,
        onChange: (value) => input.onNik(slot.key, value),
        onBlur: () => input.onNikBlur(slot.key),
      },
      holder:
        account || aliases.length > 0
          ? {
              label: t("booking.holder.source.label", { number: slot.number }),
              value: picked?.id ?? "",
              options: [
                ...aliasOptionsFor(slot.key, aliases, niks).map(({ alias, takenByOtherTicket }) => ({
                  value: alias.id,
                  label: holderOptionLabel(alias, takenByOtherTicket),
                  disabled: takenByOtherTicket && alias.id !== picked?.id,
                })),
                { value: "", label: t("booking.holder.source.manual"), disabled: false },
              ],
              hint: account ? t("booking.holder.source.hint.account") : t("booking.holder.source.hint"),
              onChange: (value: string) => input.onHolderAlias?.(slot.key, value),
            }
          : undefined,
      // Tombol hanya untuk customer yang masuk dan mengetik NIK sendiri; pilihan pemilik/alias sudah dicek otomatis.
      verify:
        account && !picked
          ? {
              label: t("booking.holder.nik.verify"),
              busy: checking,
              disabled: checking || !isNikFormat(nik),
              onClick: () => input.onNikVerify?.(slot.key),
            }
          : undefined,
    };
  });

  const lines = session.categories
    .filter((category) => (selection[category.id] ?? 0) > 0)
    .map((category) => {
      const quantity = selection[category.id] ?? 0;
      return {
        label: t("checkout.summary.line", { category: category.name, count: quantity }),
        detail: t("checkout.summary.each", { price: formatIdr(category.priceIdr) }),
        amount: formatIdr(category.priceIdr * quantity),
      };
    });

  return {
    ...input.chrome,
    header: {
      breadcrumb: [
        { label: t("checkout.breadcrumb.home"), href: "/" },
        { label: event?.name ?? session.eventName },
        { label: t("booking.breadcrumb.current") },
      ],
      steps: [
        { label: t("checkout.step.select"), state: "current" },
        { label: t("checkout.step.payment"), state: "upcoming" },
        { label: t("checkout.step.done"), state: "upcoming" },
      ],
      heading: t("booking.heading"),
      subtitle: t("booking.subtitle", { event: eventTitle }),
    },
    countdown: {
      title: t("booking.countdown.heading"),
      hint: t("booking.countdown.hint"),
      value: formatMmSs(remainingMs),
      urgent: remainingMs <= COUNTDOWN_URGENT_AT_MS,
      urgentLabel: t("booking.countdown.urgent"),
    },
    error: input.error,
    dialog: input.dialog,
    buyer: {
      title: t("booking.buyer.title"),
      hint: account ? t("booking.buyer.hint.account") : t("booking.buyer.hint"),
      email: {
        label: t("booking.buyer.email.label"),
        placeholder: t("booking.buyer.email.placeholder"),
        value: account?.email ?? form.contactEmail,
        // Email akun ditetapkan dari sesi dan tidak bisa diubah, jadi tidak pernah salah isi.
        readOnly: account ? true : undefined,
        error:
          !account && show("contactEmail") && !isEmail(form.contactEmail)
            ? t("booking.buyer.email.invalid")
            : undefined,
        onChange: input.onContactEmail,
        onBlur: () => input.onFieldBlur("contactEmail"),
      },
    },
    categories: {
      title: t("booking.categories.label"),
      limit: t("booking.categories.limit", { max }),
      items: session.categories.map((category) => {
        const quantity = selection[category.id] ?? 0;
        const soldOut = category.stock <= 0;
        return {
          id: category.id,
          name: category.name,
          description: category.description,
          priceLabel: formatIdr(category.priceIdr),
          stockLabel: soldOut
            ? t("booking.category.soldOut")
            : t("booking.category.stock", { count: category.stock }),
          soldOut,
          quantity,
          canAdd:
            count < max &&
            canAddTicket({ categoryId: category.id, selection, stock, activeBooked: session.quota.used }),
          canRemove: quantity > 0,
          addLabel: t("booking.category.add", { name: category.name }),
          removeLabel: t("booking.category.remove", { name: category.name }),
          onAdd: () => input.onAdd(category.id),
          onRemove: () => input.onRemove(category.id),
        };
      }),
    },
    holders:
      holders.length > 0
        ? {
            title: t("booking.holders.title"),
            hint: t("booking.holders.hint"),
            items: holders,
            footnote: t("booking.holders.footnote", { max }),
          }
        : undefined,
    event: event
      ? {
          imageUrl: event.imageUrl,
          tag: t("checkout.event.tag", { category: event.category, city: event.city }),
          name: eventTitle,
          date: eventDate().format(new Date(event.date)),
          venue: `${event.venue}, ${event.city}`,
        }
      : undefined,
    summary: {
      title: t("checkout.summary.title"),
      lines,
      emptyLabel: t("booking.summary.empty"),
      totalLabel: t("checkout.summary.total"),
      total: formatIdr(totalPriceIdr(selection, session.categories)),
      footnote: t("booking.summary.footnote", { count, max }),
    },
    submit: {
      label: input.submitting ? t("booking.submitting") : t("booking.submit"),
      busy: input.submitting,
      disabled:
        count === 0 ||
        remainingMs <= 0 ||
        input.submitting ||
        !isBookingFormValid(
          form,
          slots.map((s) => s.key),
        ),
      onSubmit: input.onSubmit,
    },
    notice: t("booking.notice"),
  };
}

/**
 * Konfirmasi ringkasan pesanan sebelum membuat booking dan pindah ke pembayaran. Menampilkan acara, email,
 * tiket per kategori, dan total supaya customer bisa memeriksa sebelum waktu pembayaran berjalan.
 */
export function toBookingConfirmDialog({
  session,
  event,
  selection,
  contactEmail,
  submitting,
  onConfirm,
  onDismiss,
}: {
  session: BookingSession;
  event?: BookingEvent;
  selection: Selection;
  contactEmail: string;
  submitting: boolean;
  onConfirm: () => void;
  onDismiss: () => void;
}): ActionDialogModel {
  const lines = session.categories
    .filter((category) => (selection[category.id] ?? 0) > 0)
    .map((category) => {
      const quantity = selection[category.id] ?? 0;
      return {
        label: t("checkout.summary.line", { category: category.name, count: quantity }),
        value: formatIdr(category.priceIdr * quantity),
      };
    });
  return {
    tone: "info",
    illustration: "confirmation",
    title: t("booking.confirm.title"),
    description: t("booking.confirm.description"),
    details: [
      { label: t("booking.confirm.event"), value: event?.name ?? session.eventName },
      { label: t("booking.confirm.email"), value: contactEmail.trim() },
      ...lines,
      { label: t("checkout.summary.total"), value: formatIdr(totalPriceIdr(selection, session.categories)) },
    ],
    primary: { label: t("booking.submit"), onClick: onConfirm, busy: submitting },
    secondary: { label: t("booking.confirm.back"), onClick: onDismiss },
    onDismiss,
  };
}

/** Detik hitung mundur kembali ke Beranda saat semua kategori habis (sheet Signal DS: 10 detik). */
export const SOLD_OUT_REDIRECT_SECONDS = 10;

/**
 * Stok berubah antara memilih tiket dan submit (409 `INSUFFICIENT_STOCK`). Sebagian kategori habis: customer
 * memilih kategori lain. Semua habis: kembali ke Beranda dengan hitung mundur.
 */
export function toStockUnavailableDialog({
  allSoldOut,
  secondsLeft,
  onPickAnother,
  onGoHome,
}: {
  allSoldOut: boolean;
  secondsLeft: number;
  onPickAnother: () => void;
  onGoHome: () => void;
}): ActionDialogModel {
  return {
    tone: "warning",
    illustration: "box",
    title: t("booking.stock.title"),
    description: t("booking.stock.description"),
    primary: allSoldOut
      ? { label: t("booking.stock.home", { seconds: Math.max(secondsLeft, 0) }), onClick: onGoHome }
      : { label: t("booking.stock.another"), onClick: onPickAnother },
    onDismiss: allSoldOut ? onGoHome : onPickAnother,
  };
}

/**
 * Waktu booking habis, setelah server menjawab ACCESS_EXPIRED (ADR-0005). Formulir tetap terlihat di belakang
 * dialog; permintaan produk: layar kembali ke Beranda sendiri setelah hitung mundur, atau saat customer
 * menekan tombolnya.
 */
export function toBookingTimeoutDialog({
  secondsLeft,
  onGoHome,
}: {
  secondsLeft: number;
  onGoHome: () => void;
}): ActionDialogModel {
  return {
    tone: "warning",
    icon: "clock",
    title: t("booking.timeout.title"),
    description: t("booking.timeout.description"),
    note: t("booking.timeout.redirect", { seconds: secondsLeft }),
    primary: { label: t("booking.timeout.home"), onClick: onGoHome },
    // Tidak ada booking yang bisa dilanjutkan; menutup dialog sama dengan kembali ke Beranda.
    onDismiss: onGoHome,
  };
}
