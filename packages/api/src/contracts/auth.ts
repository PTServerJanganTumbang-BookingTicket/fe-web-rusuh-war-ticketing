import { z } from "zod";

// KONTRAK-ASUMSI: POST /auth/login-link → 202. Respons sama untuk email terdaftar atau tidak (anti-enumerasi, Figma).
export const loginLinkRequest = z.object({ email: z.string(), returnTo: z.string() });

// Bentuk respons bersama untuk login-link, register, dan verification-email: email terkirim + jeda kirim ulang.
export const emailLinkSentResponse = z.object({ email: z.string(), resendAvailableAt: z.string(), serverNow: z.string() });

// KONTRAK-ASUMSI: POST /auth/session → 204, BE memasang cookie sesi httpOnly. DELETE /auth/session → 204.
export const redeemLoginLinkRequest = z.object({ token: z.string() });

// KONTRAK-ASUMSI: GET /me. NIK hanya tersamar (ADR-0011).
export const meResponse = z.object({ email: z.string(), maskedNik: z.string(), emailVerified: z.boolean() });

// KONTRAK-ASUMSI: POST /auth/register → 201. NIK sebagai string 16 digit (nol di depan bermakna).
export const registerRequest = z.object({ email: z.string(), nik: z.string() });

// KONTRAK-ASUMSI: POST /auth/verification-email → 202.
export const verificationEmailRequest = z.object({ email: z.string() });

// KONTRAK-ASUMSI: POST /auth/verify-email → 204. Tidak membuat sesi login.
export const verifyEmailRequest = z.object({ token: z.string() });

// Hanya mock (MSW): GET /mock/auth/last-link?kind=login|verification, pengganti membuka email.
export const lastEmailLinkResponse = z.object({ token: z.string() });

export type LoginLinkRequestDto = z.input<typeof loginLinkRequest>;
export type EmailLinkSentResponseDto = z.output<typeof emailLinkSentResponse>;
export type RedeemLoginLinkRequestDto = z.input<typeof redeemLoginLinkRequest>;
export type MeResponseDto = z.output<typeof meResponse>;
export type RegisterRequestDto = z.input<typeof registerRequest>;
export type VerificationEmailRequestDto = z.input<typeof verificationEmailRequest>;
export type VerifyEmailRequestDto = z.input<typeof verifyEmailRequest>;
export type LastEmailLinkResponseDto = z.output<typeof lastEmailLinkResponse>;
