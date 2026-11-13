/**
 * Pemegang tiket yang bisa dipilih customer yang masuk: NIK terdaftar miliknya atau entri Daftar NIK
 * (`GET /accounts/me/saved-niks`). API hanya mengirim NIK tersamar (kontrak §1.6, §4.1), jadi pilihan ini dikenali
 * lewat `id` dan dikirim sebagai `saved_nik_id` atau `use_account_nik`, bukan sebagai NIK.
 */
export type HolderAlias = {
  id: string;
  label: string;
  nikMasked: string;
};
