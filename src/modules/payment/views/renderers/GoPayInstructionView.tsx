/**
 * @file GoPayInstructionView.tsx
 * @description Komponen untuk render instruksi pembayaran GoPay dengan support WebView.
 *
 * Requirements: 14.34
 * Source: ADR-007 — Serah-Terima Pembayaran dari Aplikasi Mobile ke WebView
 *
 * Aturan ADR-007 §8.3:
 * - WebView dikunci ke https://rush-my-ticket.my.id
 * - Navigasi ke gojek.link / gopay:// dibuka di luar aplikasi dengan requestOpenExternal
 * - Tautan GoPay di halaman cukup <a href> biasa untuk desktop
 * - WebView butuh requestOpenExternal via postMessage
 */

import { Button } from "@/components/ui/button";

/* ========================================================================== */
/*                                   Types                                    */
/* ========================================================================== */

export type GoPayInstructionViewProps = {
  /** URL gambar QR code dari payment gateway (Midtrans) */
  readonly qrUrl: string;
  /** Label aksesibilitas untuk QR code */
  readonly qrLabel: string;
  /** Petunjuk scan QR */
  readonly hint: string;
  /** Label tombol buka aplikasi GoPay */
  readonly openAppLabel: string;
  /** URL deeplink GoPay (gojek.link atau gopay://) */
  readonly openAppHref: string;
  /** true jika halaman dibuka dari WebView mobile (window.ReactNativeWebView ada) */
  readonly isEmbedded: boolean;
  /** Callback untuk kirim deeplink ke aplikasi mobile via postMessage */
  readonly onGoPayDeeplink: (url: string) => void;
};

/* ========================================================================== */
/*                                Component                                   */
/* ========================================================================== */

/**
 * GoPayInstructionView - komponen instruksi pembayaran GoPay.
 *
 * Mendukung dua mode:
 * 1. Desktop (isEmbedded=false): tombol membuka URL langsung via window.location
 * 2. WebView (isEmbedded=true): tombol memanggil callback untuk kirim OPEN_EXTERNAL
 *    ke aplikasi mobile, yang kemudian membuka URL di luar WebView
 *
 * ADR-007: WebView dikunci ke domain tertentu, sehingga navigasi ke gojek.link
 * harus dibuka di luar WebView.
 */
export const GoPayInstructionView = (props: GoPayInstructionViewProps) => {
  const { qrUrl, qrLabel, hint, openAppLabel, openAppHref, isEmbedded, onGoPayDeeplink } = props;

  /**
   * Handle click pada tombol buka aplikasi GoPay.
   *
   * Jika isEmbedded=true, kirim OPEN_EXTERNAL ke aplikasi mobile.
   * Jika isEmbedded=false, navigasi langsung ke URL.
   */
  const handleOpenApp = () => {
    if (isEmbedded) {
      // WebView: kirim ke aplikasi via bridge untuk dibuka di luar WebView
      onGoPayDeeplink(openAppHref);
    } else {
      // Desktop: navigasi langsung
      window.location.href = openAppHref;
    }
  };

  return (
    <div className="flex flex-col items-center gap-3 rounded-xl bg-signal-disable p-4 text-center sm:p-5">
      {/* eslint-disable-next-line @next/next/no-img-element -- QR dari payment gateway, bukan aset statis */}
      <img src={qrUrl} alt={qrLabel} width={192} height={192} className="rounded-lg" />
      <p className="type-body2 text-muted-foreground">{hint}</p>
      <Button variant="outline" className="sm:hidden" onClick={handleOpenApp}>
        {openAppLabel}
      </Button>
    </div>
  );
};
