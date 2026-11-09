/**
 * Alias milik akun yang bisa dipilih sebagai pemegang tiket. Sumbernya `GET /accounts/me/saved-niks`; `nik` lengkap
 * masih asumsi FE (docs/api/contract-assumptions.md). Alias tanpa `nik` tidak bisa dipilih.
 */
export type HolderAlias = {
  id: string;
  label: string;
  nik: string;
  nikMasked: string;
};
