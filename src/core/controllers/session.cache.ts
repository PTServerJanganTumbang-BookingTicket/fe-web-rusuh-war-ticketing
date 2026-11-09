import type { QueryClient } from "@tanstack/react-query";
import { sessionKeys } from "./session.queries";

const isSessionAccount = (key: readonly unknown[]) =>
  key.length === sessionKeys.account.length &&
  sessionKeys.account.every((part, index) => part === key[index]);

/**
 * Setelah masuk: semua data di cache bisa berbeda untuk akun ini (tiket, NIK tersimpan, navbar), jadi semuanya
 * ditandai usang dan yang sedang tampil dimuat ulang. Tidak perlu tahu kunci milik modul lain.
 */
export function refreshAfterSignIn(queryClient: QueryClient) {
  return queryClient.invalidateQueries();
}

/**
 * Setelah keluar: navbar langsung menjadi tamu, dan data milik akun lama dibuang supaya tidak sempat tampil
 * untuk tamu atau akun berikutnya di perangkat yang sama.
 */
export function clearAfterSignOut(queryClient: QueryClient) {
  queryClient.setQueryData(sessionKeys.account, null);
  queryClient.removeQueries({ predicate: (query) => !isSessionAccount(query.queryKey) });
}
