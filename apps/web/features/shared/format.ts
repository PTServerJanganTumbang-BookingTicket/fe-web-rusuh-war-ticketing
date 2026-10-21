const idr = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });

/** 1500000 → "Rp 1.500.000" */
export function formatIdr(amount: number): string {
  return idr.format(amount);
}
