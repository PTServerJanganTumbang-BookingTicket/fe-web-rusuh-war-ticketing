/** Akun yang sedang login (`GET /me`). NIK hanya dalam bentuk tersamar (ADR-0011). */
export type Account = {
  email: string;
  maskedNik: string;
  emailVerified: boolean;
};

/** Email berisi link sekali pakai sudah dikirim (login atau verifikasi). Jeda kirim ulang ditentukan BE (Figma: "configurable backend policy"). */
export type EmailLinkSent = {
  email: string;
  /** Jam server saat kirim ulang boleh dilakukan (ADR-0005: countdown dari waktu absolut, bukan durasi). */
  resendAvailableAt: string;
  serverNow: string;
};
