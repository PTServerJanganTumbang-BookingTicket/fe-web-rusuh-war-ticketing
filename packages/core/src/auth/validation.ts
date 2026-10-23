// Validasi sisi klien hanya bantuan; BE tetap penentu (Figma: "client validation is assistance, not proof").

export type EmailProblem = "required" | "invalid";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function emailProblem(value: string): EmailProblem | undefined {
  const email = value.trim();
  if (email === "") return "required";
  return EMAIL.test(email) ? undefined : "invalid";
}

export const NIK_LENGTH = 16;

/** NIK disimpan sebagai string 16 digit: angka nol di depan bermakna, jadi bukan number (Figma: "NIK is a string"). */
export function isValidNik(value: string): boolean {
  return /^\d{16}$/.test(value);
}

export type NikProblem = "required" | "invalid";

export function nikProblem(value: string): NikProblem | undefined {
  if (value === "") return "required";
  return isValidNik(value) ? undefined : "invalid";
}

/** Input NIK hanya menerima digit, maksimal 16 (Figma: "reject non-digits on input/paste"). */
export function sanitizeNikInput(value: string): string {
  return value.replace(/\D/g, "").slice(0, NIK_LENGTH);
}

export type RegistrationInput = { email: string; nik: string };
export type RegistrationProblems = { email?: EmailProblem; nik?: NikProblem };

/** Kosong berarti siap direview. Review tidak memanggil BE (Figma: "opens confirmation; it does not call the endpoint"). */
export function registrationProblems({ email, nik }: RegistrationInput): RegistrationProblems {
  const emailIssue = emailProblem(email);
  const nikIssue = nikProblem(nik);
  return { ...(emailIssue && { email: emailIssue }), ...(nikIssue && { nik: nikIssue }) };
}

// Halaman auth tidak boleh menjadi tujuan kembali: menghindari loop login ↔ callback.
const AUTH_PATH = /^\/(login|auth|register)(?=$|[/?#])/;

/**
 * Tujuan setelah login: hanya path same-origin (Figma: "safe allowlisted return route"). Nilai dari URL tidak dipercaya,
 * jadi URL absolut, protocol-relative (`//host`), dan backslash ditolak dan diganti `fallback`.
 */
export function resolveReturnTo(raw: string | null | undefined, fallback = "/"): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) return fallback;
  return AUTH_PATH.test(raw) ? fallback : raw;
}
