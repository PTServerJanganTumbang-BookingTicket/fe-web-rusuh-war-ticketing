import { resolveReturnTo } from "../auth/validation";
import { AppFailure } from "../errors/appError";
import type { RedeemLoginLink } from "./ports";

export type RedeemLoginLinkDeps = { redeemLoginLink: RedeemLoginLink };

/**
 * Membuka link login: tukar token menjadi sesi, lalu kembalikan tujuan yang aman (Figma: "return to the requested page").
 * Link tanpa token diperlakukan sama dengan link tidak valid, tanpa memanggil BE.
 */
export async function redeemLoginLink(deps: RedeemLoginLinkDeps, token: string | null, returnTo: string | null): Promise<string> {
  if (!token) throw new AppFailure({ kind: "api", code: "LOGIN_LINK_INVALID", status: 400 });
  await deps.redeemLoginLink(token);
  return resolveReturnTo(returnTo);
}
