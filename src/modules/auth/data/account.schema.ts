import { z } from "zod";
import type { Account, EventSummary, LoginResult, Profile, SavedNikList } from "../domain/account.model";

const accountSchema = z
  .object({ email: z.string(), nik_masked: z.string() })
  .transform((account): Account => ({ email: account.email, nikMasked: account.nik_masked }));

/** `data` dari route same-origin `POST /api/auth/verify`. Token akun tidak pernah ada di sini. */
export const loginResultSchema = z
  .object({
    redirect_path: z.string(),
    booking: z.object({ event_id: z.string().optional(), booking_id: z.string().optional() }).nullable(),
  })
  .transform((result): LoginResult => ({
    redirectPath: result.redirect_path,
    booking: result.booking
      ? { eventId: result.booking.event_id, bookingId: result.booking.booking_id }
      : null,
  }));

/** `data` dari `GET /events/{event_id}`, hanya bagian yang dipakai kartu konteks booking. */
export const eventSummarySchema = z
  .object({
    name: z.string(),
    location: z.object({ venue: z.string(), city: z.string() }),
    date: z.string(),
    image_url: z.string(),
  })
  .transform((event): EventSummary => ({
    name: event.name,
    city: event.location.city,
    venue: event.location.venue,
    date: event.date,
    imageUrl: event.image_url,
  }));

/** `data` dari `GET /api/auth/session`. */
export const sessionSchema = z
  .object({ account: accountSchema.nullable() })
  .transform((session): Account | null => session.account);

/** `data` dari `GET /accounts/me/saved-niks` (diteruskan lewat `/api/account/saved-niks`). */
export const savedNikListSchema = z
  .object({
    max_entries: z.number(),
    saved_niks: z.array(
      z.object({ id: z.string(), nik_masked: z.string(), label: z.string(), verified_at: z.string() }),
    ),
  })
  .transform((list): SavedNikList => ({
    maxEntries: list.max_entries,
    savedNiks: list.saved_niks.map((saved) => ({
      id: saved.id,
      nikMasked: saved.nik_masked,
      label: saved.label,
      verifiedAt: saved.verified_at,
    })),
  }));

/** `data` dari `GET /accounts/me` (diteruskan lewat `/api/account/profile`). Bentuk ini asumsi FE. */
export const profileSchema = z
  .object({
    name: z.string(),
    email: z.string(),
    nik_masked: z.string(),
    created_at: z.string().nullish(),
  })
  .transform((profile): Profile => ({
    name: profile.name,
    email: profile.email,
    nikMasked: profile.nik_masked,
    memberSince: profile.created_at ?? null,
  }));
