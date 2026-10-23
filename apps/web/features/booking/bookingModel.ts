import { isAccessExpired, type AppError, type BookingSession, type Selection } from "@rusuh/core";

// Kondisi layar Detail Ticket (ADR-0017). Murni dan tanpa i18n: teks dibentuk di toBookingViewProps.

/** Setelah server menjawab ACCESS_EXPIRED: langsung kembali ke ruang tunggu, atau tampilkan layar sesi berakhir. */
export type BookingExpiryMode = "queue" | "screen";

export type BookingScreenState =
  | { kind: "loading" }
  | { kind: "failed"; error: AppError }
  | { kind: "expired"; next: "redirect" | "screen" }
  | { kind: "selecting"; session: BookingSession; selection: Selection; remainingMs: number };

export type BookingScreenInput = {
  session: BookingSession | undefined;
  error: AppError | undefined;
  selection: Selection;
  remainingMs: number | null;
  expiryMode: BookingExpiryMode;
};

export function deriveBookingScreenState({ session, error, selection, remainingMs, expiryMode }: BookingScreenInput): BookingScreenState {
  // Hanya jawaban server yang menyatakan sesi berakhir, bukan timer klien (ADR-0005).
  if (error && isAccessExpired(error)) return { kind: "expired", next: expiryMode === "queue" ? "redirect" : "screen" };
  if (!session) return error ? { kind: "failed", error } : { kind: "loading" };
  if (remainingMs === null) return { kind: "loading" };
  // Error lain saat refresh stok tidak memutus layar: data terakhir tetap dipakai.
  return { kind: "selecting", session, selection, remainingMs };
}
