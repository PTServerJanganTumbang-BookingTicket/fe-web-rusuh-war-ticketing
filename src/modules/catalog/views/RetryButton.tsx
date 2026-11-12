import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

export type RetryProps = { label: string; busy: boolean; onClick: () => void };

/**
 * Tombol muat ulang di keadaan galat dan "belum ada event". Polling berhenti setelah galat kontrak, jadi tanpa
 * tombol ini customer harus memuat ulang halaman. `type="button"` supaya aman bila suatu hari ada di dalam form.
 */
export function RetryButton({ label, busy, onClick }: RetryProps) {
  return (
    <Button type="button" variant="outline" size="lg" disabled={busy} aria-busy={busy} onClick={onClick}>
      {busy ? <Spinner data-icon="inline-start" /> : null}
      {label}
    </Button>
  );
}
