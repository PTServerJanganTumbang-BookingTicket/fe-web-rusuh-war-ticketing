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
import { aliasOptionsFor } from "../domain/ticket-holders.rules";
import type { BookingViewProps, TicketHolderProps } from "../views/BookingView";
import type { ActionDialogModel } from "@/core/controllers/modal.hook";

/** Nama panggilan plus nama lengkap bila ada, supaya alias dengan nama panggilan mirip bisa dibedakan. */
function aliasName(alias: HolderAlias): string {
  return alias.name
    ? t("booking.holder.source.named", { label: alias.label, name: alias.name })
    : alias.label;
}

/** Bulan singkat mengikuti bahasa aktif. */
const eventDate = () =>
  new Intl.DateTimeFormat(intlLocale(), { day: "2-digit", month: "short", year: "numeric" });

/** Status cek NIK per slot. `nik` dicatat supaya hasil untuk NIK lama tidak dipakai setelah diketik ulang. */
export type NikCheckState =
  | { nik: string; state: "checking" }
  | { nik: string; state: "done"; result: NikCheck }
  | { nik: string; state: "failed" };

export type BookingForm = {
  buyerName: string;
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
  onBuyerName: (value: string) => void;
  onContactEmail: (value: string) => void;
  onNik: (slotKey: string, value: string) => void;
  onNikBlur: (slotKey: string) => void;
  /** Alias akun yang bisa dipilih. Kosong untuk tamu. */
  aliases?: readonly HolderAlias[];
  /** `aliasId` kosong berarti kembali ke isian NIK manual. */
  onHolderAlias?: (slotKey: string, aliasId: string) => void;
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

/** Form siap dikirim: pemesan lengkap, tiap tiket punya NIK unik berformat benar, dan tidak ada NIK yang ditolak. */
export function isBookingFormValid(form: BookingForm, slotKeys: string[]): boolean {
  if (slotKeys.length === 0 || form.buyerName.trim() === "" || !isEmail(form.contactEmail)) return false;
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
    const aliases = input.aliases ?? [];
    const pickedId = form.aliasPicks?.[slot.key];
    const picked = aliases.find((alias) => alias.id === pickedId);
    return {
      id: slot.key,
      title: t("booking.holder.ticket", { category: slot.categoryName }),
      priceLabel: formatIdr(slot.priceIdr),
      nik: {
        label: t("booking.holder.nik.label", { number: slot.number }),
        placeholder: t("booking.holder.nik.placeholder"),
        // NIK alias ditampilkan tersamar; nilai lengkapnya hanya dikirim ke server.
        value: picked ? picked.nikMasked : nik,
        readOnly: Boolean(picked),
        focusKey: input.focusNik?.slotKey === slot.key ? input.focusNik.n : undefined,
        error,
        success: error ? undefined : success,
        onChange: (value) => input.onNik(slot.key, value),
        onBlur: () => input.onNikBlur(slot.key),
      },
      holder:
        aliases.length > 0
          ? {
              label: t("booking.holder.source.label", { number: slot.number }),
              value: picked?.id ?? "",
              options: [
                { value: "", label: t("booking.holder.source.manual"), disabled: false },
                ...aliasOptionsFor(slot.key, aliases, niks).map(({ alias, takenByOtherTicket }) => ({
                  value: alias.id,
                  label: takenByOtherTicket
                    ? t("booking.holder.source.taken", { label: aliasName(alias), nik: alias.nikMasked })
                    : t("booking.holder.source.alias", { label: aliasName(alias), nik: alias.nikMasked }),
                  disabled: takenByOtherTicket && alias.id !== picked?.id,
                })),
              ],
              hint: t("booking.holder.source.hint"),
              onChange: (value: string) => input.onHolderAlias?.(slot.key, value),
            }
          : undefined,
      seat: { label: t("booking.holder.seat.label"), value: t("booking.holder.seat.value") },
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
      hint: t("booking.buyer.hint"),
      name: {
        label: t("booking.buyer.name.label"),
        placeholder: t("booking.buyer.name.placeholder"),
        value: form.buyerName,
        error:
          show("buyerName") && form.buyerName.trim() === "" ? t("booking.buyer.name.required") : undefined,
        onChange: input.onBuyerName,
        onBlur: () => input.onFieldBlur("buyerName"),
      },
      email: {
        label: t("booking.buyer.email.label"),
        placeholder: t("booking.buyer.email.placeholder"),
        value: form.contactEmail,
        error:
          show("contactEmail") && !isEmail(form.contactEmail) ? t("booking.buyer.email.invalid") : undefined,
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
