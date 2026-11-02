---
inclusion: auto
name: Forbidden Patterns
description: Larangan keras dan anti-pattern yang harus dihindari. Aktifkan saat menulis atau me-review kode.
---

# Forbidden Patterns

Larangan keras dan anti-pattern. Referensi: `docs/ai/steering/architecture-rules.md`.

## Larangan Arsitektur

1. **Jangan buat class controller** — Controller adalah hook `use<Layar>Controller`
2. **Jangan simpan server state di Context** — Pakai TanStack Query
3. **Jangan buat container Awilix di luar `src/di`** (kecuali test)
4. **Jangan pakai polling untuk antrian/status** — Pakai SSE (`useLiveUpdates`)
5. **Jangan hitung countdown dari durasi** — Selalu dari `expiresAt` + offset server via `src/core/domain/time`
6. **Jangan putuskan expired di klien** — Panggil endpoint status saat timer nol
7. **Jangan panggil Midtrans langsung** — Hanya lewat endpoint BE
8. **Jangan taruh token di URL** (kecuali one-time code WebView)
9. **Jangan pasang provider client di root layout** — Home harus statis
10. **Jangan edit `src/core/data/http/generated/`** — Regenerate dari OpenAPI
11. **Jangan tulis angka bisnis langsung** — Taruh di `*.constants.ts`
12. **Jangan pakai hex/rgb di views** — Pakai token Signal DS
13. **Jangan buat class component** — Pakai functional component. Untuk error boundary, gunakan `react-error-boundary` (bukan class sendiri).
14. **Jangan gunakan `asClass` di Awilix** — Semua registrasi memakai `asFunction` atau `asValue`. Tidak ada pengecualian.

## Larangan TypeScript

- **Tidak ada `any`** — Gunakan `unknown` lalu parse
- **Tidak ada `@ts-ignore`** — Pakai `@ts-expect-error` dengan alasan (min 10 karakter)
- **Tidak ada ternary bersarang** — Ekstrak ke fungsi atau early return
- **Tidak ada `console.*`** di kode yang di-commit
- **Tidak ada kode mati**, kode yang dikomentari, atau import tak terpakai

## Larangan ESLint

- **`eslint-disable` wajib disertai komentar alasan**
- **Jangan lewati hook dengan `--no-verify`**

## Larangan Abstraksi

- **Jangan buat abstraksi untuk satu pemakaian** — Ekstrak setelah dipakai di tempat ketiga

## Cleanup Wajib

- **Bersihkan saat unmount**: listener, timer, `AbortController`, subscription
- Polling antrian dan countdown rawan memory leak

## Aksesibilitas

- **Pakai elemen semantik**: `<button>`, `<nav>`, `<main>` — bukan `<div onClick>`
- **Gambar punya `alt`**; gambar dekoratif memakai `alt=""`
- **Input punya label**; pesan error dihubungkan via `aria-describedby`
- **Target sentuh minimal 44x44px**
- **Dialog/popup pakai Radix `Dialog`** — jangan buat ulang manual

## Design System

- **Pakai token Signal DS** — bukan hex, rgb, atau nama warna Tailwind mentah
- **Font lewat `next/font`** — tidak ada `<link>` ke CDN font
- **Wireframe adalah referensi struktur**, bukan desain visual

## Komentar dan Dokumentasi

- **Komentar menjelaskan *mengapa*, bukan *apa***
- **`TODO`/`FIXME` menyertakan rujukan issue**
- **Controller header** mencantumkan ID requirement dan nomor wireframe

## Use Case dan Service

- **Use case dan service tidak menangkap error** — Biarkan `AppFailure` naik ke controller
- **Constructor bertipe protocol (interface)**, bukan kelas konkret

## Git

- **Jangan `git push --force`** tanpa konfirmasi eksplisit
- **Jangan push langsung ke `main`** tanpa konfirmasi
- **Satu PR satu concern** — PR arsitektur menyertakan ADR

## Jika Ragu

Kalau perubahan butuh melanggar aturan di atas, **berhenti dan usulkan ADR baru**.
