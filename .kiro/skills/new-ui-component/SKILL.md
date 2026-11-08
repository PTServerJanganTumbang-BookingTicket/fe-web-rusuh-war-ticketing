---
name: new-ui-component
description: Membuat komponen presentasional (design system di src/components/ui atau view modul di src/modules/<m>/views) di atas Telkomsel Signal Design System dan Tailwind, props-only, dengan story per state dan cek aksesibilitas. Gunakan untuk setiap komponen visual baru.
---

# New UI Component

## Langkah

0. **Tentukan lokasi.** Dipakai lebih dari satu modul atau berupa kerangka/primitif: `src/components/ui`. Khusus satu layar: `src/modules/<m>/views`. View hanya boleh mengimpor design system dan view modulnya sendiri (ESLint boundaries).
1. **Cek primitif dulu** di `src/components/ui/primitives` (ADR-0012). Jika sudah ada, pakai atau bungkus tipis. Jika belum, porting dari implementasi referensi Signal internal tim (shadcn/Radix dengan token Signal) dengan varian Signal. Jangan membuat ulang dengan Tailwind mentah.
2. **Definisikan props sebagai kontrak.** Props berupa data siap tampil dan callback (`onAdd`, `onSubmit`). Tidak ada objek domain mentah yang perlu diolah di dalam komponen, tidak ada hook data.
3. **Styling.** Komponen Signal untuk elemen; Tailwind untuk layout dan spacing. Warna dan tipografi hanya dari token semantik (`bg-primary`, `text-muted`, dst.); nilai hex ditolak ESLint. Pakai `ScreenFrame` untuk kerangka layar dan `CountdownCard` untuk timer sebelum membuat kerangka baru. Kelas Tailwind ditulis utuh (tidak dirangkai dari string) agar terdeteksi.
4. **String.** Diterima lewat props atau key i18n, tidak di-hardcode.
5. **Aksesibilitas.**
   - Semua kontrol bisa dioperasikan keyboard dan punya label.
   - Countdown: `role="timer"` dengan `aria-live="off"`; peringatan 60 detik lewat live region terpisah `assertive` (lihat `coding-conventions.md`).
   - Kontras mengikuti WCAG 2.1 AA.
6. **Story.** Satu story per state visual: default, loading, disabled, error, kosong, dan state khusus (mis. stok habis, sisa < 60 detik).
7. **Impor langsung dari file** (tanpa barrel), kecuali primitif yang juga diekspor dari `src/components/ui/primitives/index.ts`.

## Checklist

- [ ] Tidak mengimpor `application`, `data`, `controllers`, i18n, hook, atau TanStack Query.
- [ ] Addon a11y Storybook tanpa pelanggaran serius.
- [ ] Tampil benar di lebar 360px (layout WebView mobile).
