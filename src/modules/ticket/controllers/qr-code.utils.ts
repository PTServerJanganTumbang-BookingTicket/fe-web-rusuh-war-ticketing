import qrcode from "qrcode-generator";

/**
 * QR e-tiket. Sumber kebenarannya `qr_value` dari BE (`TKT|event|NIK`, kontrak §6.2): itulah yang dipindai di gerbang,
 * jadi gambarnya digambar dari nilai itu di sini. Gambar `qr_code` dari BE hanya cadangan bila `qr_value` kosong,
 * karena bisa berupa gambar kosong atau tidak terbaca.
 */
export function toQrImageSrc(qrValue: string, fallback: string): string {
  if (!qrValue) return fallback;
  // Tipe 0 = ukuran otomatis; koreksi galat M cukup untuk dipindai dari layar.
  const code = qrcode(0, "M");
  code.addData(qrValue, "Byte");
  code.make();
  const svg = code.createSvgTag({ cellSize: 8, margin: 4, scalable: true });
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
