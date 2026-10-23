import type { EmailLinkSent } from "../domain/account";
import type { Order, PaymentMethod } from "../domain/payment";

// Port: I/O yang dibutuhkan use case, ditulis sebagai tipe fungsi (bukan class atau interface).
// Adapter di packages/api sudah memenuhinya secara struktural. Penyambungannya hanya terjadi di
// apps/web/features/shared/composition.ts (ADR-0015).

/** Menitipkan access token antrian sebagai sesi booking (cookie httpOnly, ADR-0008). */
export type StartSession = (accessToken: string) => Promise<void>;

/** Memulai pembayaran lewat BE. FE tidak pernah memanggil Midtrans (ADR-0006). */
export type StartPayment = (orderId: string, method: PaymentMethod) => Promise<Order>;

/**
 * Meminta BE mengirim link login sekali pakai ke email. Respons sama untuk email terdaftar atau tidak (anti-enumerasi).
 * `returnTo` ikut ke link supaya customer kembali ke halaman tadi, juga bila link dibuka di perangkat lain.
 */
export type SendLoginLink = (email: string, returnTo: string) => Promise<EmailLinkSent>;

/** Menukar token dari link login menjadi sesi. BE memasang cookie sesi httpOnly; token tidak disimpan FE. */
export type RedeemLoginLink = (token: string) => Promise<void>;

/** Mengakhiri sesi login di BE. */
export type EndSession = () => Promise<void>;

/**
 * Mendaftarkan akun. BE memvalidasi ulang, memverifikasi NIK ke Dukcapil, lalu mengirim email verifikasi.
 * Akun belum terverifikasi dan customer belum login setelahnya (Figma: "Registered · verification still required").
 */
export type RegisterAccount = (email: string, nik: string) => Promise<EmailLinkSent>;

/** Mengirim ulang email verifikasi. */
export type SendVerificationEmail = (email: string) => Promise<EmailLinkSent>;

/** Menukar token dari link verifikasi. Tidak membuat sesi login (Figma: "Your email is verified · Continue to Login"). */
export type VerifyEmail = (token: string) => Promise<void>;
