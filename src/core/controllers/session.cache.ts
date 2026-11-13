import type { QueryClient } from "@tanstack/react-query";
import { sessionKeys } from "./session.queries";

const isSessionAccount = (key: readonly unknown[]) =>
  key.length === sessionKeys.account.length &&
  sessionKeys.account.every((part, index) => part === key[index]);

/**
 * Setelah masuk: semua data di cache bisa berbeda untuk akun ini (tiket, NIK tersimpan, navbar), jadi semuanya
 * ditandai usang dan yang sedang tampil dimuat ulang. Tidak perlu tahu kunci milik modul lain.
 *
 * Permintaan yang masih di jalan dibatalkan dulu: jawabannya dibuat server saat pengguna masih tamu, dan kalau
 * dibiarkan mendarat setelah ini, navbar route lain memakai "tamu" sebagai data segar sampai `staleTime` habis.
 */
export async function refreshAfterSignIn(queryClient: QueryClient) {
  await queryClient.cancelQueries();
  await queryClient.invalidateQueries();
}

/**
 * Setelah keluar: navbar langsung menjadi tamu, dan data milik akun lama dibuang supaya tidak sempat tampil
 * untuk tamu atau akun berikutnya di perangkat yang sama. Panggil setelah server selesai menghapus cookie.
 *
 * Permintaan yang masih di jalan (pemeriksaan sesi saat tab difokuskan, daftar alias) dibatalkan dulu, dan
 * pembatalannya ditunggu: jawaban yang berangkat sebelum logout membawa akun lama, dan pembatalan TanStack Query
 * mengembalikan state sebelum fetch, jadi `null` baru ditulis sesudahnya.
 */
export async function clearAfterSignOut(queryClient: QueryClient) {
  await queryClient.cancelQueries();
  queryClient.setQueryData(sessionKeys.account, null);
  queryClient.removeQueries({ predicate: (query) => !isSessionAccount(query.queryKey) });
}
