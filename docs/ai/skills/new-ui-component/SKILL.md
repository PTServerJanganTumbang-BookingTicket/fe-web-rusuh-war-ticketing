---
name: new-ui-component
description: Membuat komponen presentasional di packages/ui di atas Telkomsel Signal Design System dan Tailwind, props-only, dengan story per state dan cek aksesibilitas. Gunakan untuk setiap komponen visual baru.
---

# New UI Component

## Langkah

1. **Cek primitif dulu** di `packages/ui/src/primitives` (ADR-0012). Jika sudah ada, pakai atau bungkus tipis. Jika belum, porting dari implementasi referensi Signal internal tim (shadcn/Radix dengan token Signal) dengan varian Signal. Jangan membuat ulang dengan Tailwind mentah.
2. **Definisikan props sebagai kontrak.** Props berupa data siap tampil dan callback (`onAdd`, `onSubmit`). Tidak ada objek domain mentah yang perlu diolah di dalam komponen, tidak ada hook data.
3. **Styling.** Komponen Signal untuk elemen; Tailwind untuk layout dan spacing. Warna dan tipografi hanya dari token semantik (`bg-primary`, `text-muted`, dst.); nilai hex ditolak ESLint. Pakai `ScreenFrame` untuk kerangka layar dan `CountdownCard` untuk timer sebelum membuat kerangka baru. Kelas Tailwind ditulis utuh (tidak dirangkai dari string) agar terdeteksi.
4. **String.** Diterima lewat props atau key i18n, tidak di-hardcode.
5. **Aksesibilitas.**
   - Semua kontrol bisa dioperasikan keyboard dan punya label.
   - Countdown: `aria-live="polite"`; peringatan kritis: `assertive`.
   - Kontras mengikuti WCAG 2.1 AA.
6. **Story.** Satu story per state visual: default, loading, disabled, error, kosong, dan state khusus (mis. stok habis, sisa < 60 detik).
7. **Export** dari `packages/ui/src/index.ts`.

## Checklist

- [ ] Tidak mengimpor `api`, `features`, atau TanStack Query.
- [ ] Addon a11y Storybook tanpa pelanggaran serius.
- [ ] Tampil benar di lebar 360px (layout WebView mobile).
