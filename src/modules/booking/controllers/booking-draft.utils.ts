import type { Selection } from "../domain/selection.reducer";

/**
 * Isian formulir booking yang dipertahankan saat halaman dimuat ulang. Disimpan di sessionStorage (per tab, per event)
 * dan terikat `expiresAt` grant: grant baru atau habis berarti draf tidak berlaku lagi. Hasil cek Dukcapil tidak
 * disimpan; NIK yang dipulihkan diverifikasi ulang oleh customer.
 */
export type BookingDraft = {
  expiresAt: string;
  selection: Selection;
  niks: Record<string, string>;
  aliasPicks: Record<string, string>;
  contactEmail: string;
};

const draftKey = (eventId: string) => `rusuh.booking_draft.${eventId}`;

function storage(): Storage | undefined {
  try {
    return typeof window === "undefined" ? undefined : window.sessionStorage;
  } catch {
    return undefined;
  }
}

const isRecordOf = (value: unknown, check: (item: unknown) => boolean): value is Record<string, never> =>
  typeof value === "object" && value !== null && Object.values(value).every(check);

/** Draf untuk grant `expiresAt`; `null` bila tidak ada, rusak, atau milik grant lain (yang lama dibuang). */
export function loadBookingDraft(eventId: string, expiresAt: string): BookingDraft | null {
  try {
    const raw = storage()?.getItem(draftKey(eventId));
    if (!raw) return null;
    const draft = JSON.parse(raw) as Partial<BookingDraft>;
    if (
      draft.expiresAt !== expiresAt ||
      !isRecordOf(draft.selection, (n) => typeof n === "number") ||
      !isRecordOf(draft.niks, (s) => typeof s === "string") ||
      !isRecordOf(draft.aliasPicks, (s) => typeof s === "string") ||
      typeof draft.contactEmail !== "string"
    ) {
      clearBookingDraft(eventId);
      return null;
    }
    return draft as BookingDraft;
  } catch {
    return null;
  }
}

/** Menyimpan draf; draf kosong menghapus entri. */
export function saveBookingDraft(eventId: string, draft: BookingDraft) {
  const empty =
    Object.keys(draft.selection).length === 0 &&
    Object.values(draft.niks).every((nik) => !nik) &&
    Object.keys(draft.aliasPicks).length === 0 &&
    !draft.contactEmail;
  if (empty) return clearBookingDraft(eventId);
  try {
    storage()?.setItem(draftKey(eventId), JSON.stringify(draft));
  } catch {
    // Storage penuh atau diblokir: formulir tetap jalan tanpa pemulihan.
  }
}

export function clearBookingDraft(eventId: string) {
  try {
    storage()?.removeItem(draftKey(eventId));
  } catch {
    // Tidak ada yang bisa dihapus.
  }
}
