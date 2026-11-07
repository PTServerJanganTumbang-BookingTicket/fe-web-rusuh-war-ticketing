import { http } from "msw";
import { fail, field, hasBearer, noContent, ok, okMeta, readJson } from "./envelope";
import { isNikFormat, lookupNik, MAX_SAVED_NIKS, maskNik, REGISTERED_NIK } from "./fixtures";
import type { MockState } from "./state";

const MAGIC_LINK_COOLDOWN_MS = 60_000;
const ACCESS_TOKEN_TTL_SECONDS = 22_740;

const isEmail = (value: unknown): value is string =>
  typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

/** Tag Authentication dan Accounts. */
export function authHandlers(state: MockState, baseUrl: string) {
  const issueTokens = () => {
    const refreshToken = `rt_${state.nextId("")}`;
    state.refreshTokens.add(refreshToken);
    return {
      access_token: `at_${state.nextId("")}`,
      refresh_token: refreshToken,
      expires_in: ACCESS_TOKEN_TTL_SECONDS,
    };
  };

  return [
    http.post(`${baseUrl}/auth/magic-link`, async ({ request }) => {
      const email = field(await readJson(request), "email");
      if (!isEmail(email)) return fail(400, "email is required");
      const now = Date.now();
      const until = state.magicLinkCooldown.get(email) ?? 0;
      if (now < until)
        return fail(429, "Please wait before requesting another link", {
          retry_after: Math.ceil((until - now) / 1000),
        });
      state.magicLinkCooldown.set(email, now + MAGIC_LINK_COOLDOWN_MS);
      return okMeta("Login link sent to your email");
    }),

    http.post(`${baseUrl}/auth/magic-link/resend`, async ({ request }) => {
      const email = field(await readJson(request), "email");
      if (!isEmail(email)) return fail(400, "email is required");
      state.magicLinkCooldown.set(email, Date.now() + MAGIC_LINK_COOLDOWN_MS);
      return okMeta("New login link sent");
    }),

    // Token apa pun diterima kecuali "expired"; cara token sampai ke sini masih usulan di ADR-0023.
    http.get(`${baseUrl}/auth/verify`, ({ cookies }) => {
      const token = cookies.magic_token;
      if (!token || token === "expired") return fail(401, "Invalid or expired magic token");
      return ok(
        {
          ...issueTokens(),
          user: { id: "usr_123", email: "you@example.com", nik: maskNik(REGISTERED_NIK) },
          redirect_context: {
            type: "booking",
            event_id: "evt_konser_a",
            booking_id: "RB-00912",
            message: "Booking context restored",
          },
        },
        { message: "Login successful" },
      );
    }),

    // Rotasi: refresh token yang dikirim hangus, pemakaian ulang ditolak 401.
    http.post(`${baseUrl}/auth/refresh`, async ({ request }) => {
      const refreshToken = field(await readJson(request), "refresh_token");
      if (typeof refreshToken !== "string" || refreshToken === "")
        return fail(400, "refresh_token is required");
      if (!state.refreshTokens.delete(refreshToken)) return fail(401, "Session ended; please sign in again");
      return ok(issueTokens(), { message: "Session refreshed" });
    }),

    http.post(`${baseUrl}/auth/register`, async ({ request }) => {
      const body = await readJson(request);
      const email = field(body, "email");
      const nik = field(body, "nik");
      const consent = field(body, "consent");
      if (!isEmail(email)) return fail(400, "email is required");
      if (!isNikFormat(nik)) return fail(400, "NIK must be exactly 16 digits");
      if (field(consent, "accepted") !== true || typeof field(consent, "policy_version") !== "string")
        return fail(422, "Consent is required");
      if (nik === REGISTERED_NIK) return fail(409, "NIK already registered to another account");
      return ok({ user_id: `usr_${state.nextId("")}` }, { message: "Verification link sent to your email" });
    }),

    http.get(`${baseUrl}/accounts/me/saved-niks`, ({ request }) => {
      if (!hasBearer(request)) return fail(401, "Unauthorized");
      return ok({
        max_entries: MAX_SAVED_NIKS,
        saved_niks: state.savedNiks.map((saved) => ({
          id: saved.id,
          nik: saved.nik,
          nik_masked: saved.nikMasked,
          label: saved.label,
          name: saved.name,
          verified_at: saved.verifiedAt,
          status: "VERIFIED",
        })),
      });
    }),

    // Dukcapil dipanggil saat menyimpan, bukan saat checkout (design.md).
    http.post(`${baseUrl}/accounts/me/saved-niks`, async ({ request }) => {
      if (!hasBearer(request)) return fail(401, "Unauthorized");
      const body = await readJson(request);
      const nik = field(body, "nik");
      const label = field(body, "label");
      const name = field(body, "name");
      if (!isNikFormat(nik) || typeof label !== "string" || label.trim() === "")
        return fail(400, "nik and label are required");
      // Asumsi FE: `name` opsional supaya klien lama tetap bisa menyimpan.
      if (name !== undefined && typeof name !== "string") return fail(400, "name must be a string");
      if (lookupNik(nik)?.status !== "ACTIVE") return fail(400, "NIK not found or inactive");
      if (state.savedNiks.length >= MAX_SAVED_NIKS) return fail(409, "Maximum saved NIKs reached");
      if (state.savedNiks.some((saved) => saved.nikMasked === maskNik(nik)))
        return fail(409, "NIK already saved");
      const saved = {
        id: `snk_${state.nextId("")}`,
        nik,
        nikMasked: maskNik(nik),
        label,
        name: typeof name === "string" ? name.trim() : "",
        verifiedAt: new Date().toISOString(),
      };
      state.savedNiks.push(saved);
      return ok(
        {
          id: saved.id,
          nik_masked: saved.nikMasked,
          label,
          name: saved.name,
          verified_at: saved.verifiedAt,
          status: "VERIFIED",
        },
        { status: 201, message: "NIK saved" },
      );
    }),

    // Asumsi FE, belum ada di kontrak: ubah label dan, bila dikirim, NIK (dicek ulang ke Dukcapil).
    http.patch(`${baseUrl}/accounts/me/saved-niks/:id`, async ({ request, params }) => {
      if (!hasBearer(request)) return fail(401, "Unauthorized");
      const saved = state.savedNiks.find((item) => item.id === params.id);
      if (!saved) return fail(404, "Saved NIK not found");
      const body = await readJson(request);
      const label = field(body, "label");
      const nik = field(body, "nik");
      const name = field(body, "name");
      if (typeof label !== "string" || label.trim() === "") return fail(400, "label is required");
      if (name !== undefined && typeof name !== "string") return fail(400, "name must be a string");
      if (nik !== undefined) {
        if (!isNikFormat(nik)) return fail(400, "NIK must be exactly 16 digits");
        if (lookupNik(nik)?.status !== "ACTIVE") return fail(400, "NIK not found or inactive");
        if (state.savedNiks.some((item) => item.id !== saved.id && item.nik === nik))
          return fail(409, "NIK already saved");
        saved.nik = nik;
        saved.nikMasked = maskNik(nik);
        saved.verifiedAt = new Date().toISOString();
      }
      saved.label = label.trim();
      if (typeof name === "string") saved.name = name.trim();
      return ok(
        {
          id: saved.id,
          nik: saved.nik,
          nik_masked: saved.nikMasked,
          label: saved.label,
          name: saved.name,
          verified_at: saved.verifiedAt,
          status: "VERIFIED",
        },
        { message: "Saved NIK updated" },
      );
    }),

    // Asumsi FE, belum ada di kontrak: profil akun yang sedang masuk.
    http.get(`${baseUrl}/accounts/me`, ({ request }) => {
      if (!hasBearer(request)) return fail(401, "Unauthorized");
      return ok({
        id: "usr_123",
        name: lookupNik(REGISTERED_NIK)?.name ?? "",
        email: "you@example.com",
        nik_masked: maskNik(REGISTERED_NIK),
        created_at: "2026-10-01T09:00:00Z",
      });
    }),

    http.delete(`${baseUrl}/accounts/me/saved-niks/:id`, ({ request, params }) => {
      if (!hasBearer(request)) return fail(401, "Unauthorized");
      const index = state.savedNiks.findIndex((saved) => saved.id === params.id);
      if (index === -1) return fail(404, "Saved NIK not found");
      state.savedNiks.splice(index, 1);
      return noContent();
    }),
  ];
}
