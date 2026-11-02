# ADR-0017: Design System Selection — Radix + Signal Tokens

- **Status**: Superseded by ADR-0012 (Radix + Signal Tokens approach divalidasi sebagai solusi final)
- **Tanggal**: 2026-10-20 / Diperbarui: 2026-11-02
- **Pengambil keputusan**: Tim FE Web
- **Requirement terkait**: NFR-08, Telkomsel Signal DS branding requirement

## Konteks

Aplikasi **Rusuh Booking Tiket** wajib mengikuti branding Signal/Telkomsel.

### Evaluasi Awal

Evaluasi awal mempertimbangkan tiga opsi:

1. **Shadcn + Radix + Signal Tokens** — Komponen Radix dengan styling Signal
2. **Signal UI React (`@signal-web-ui/react`)** — Paket resmi Stencil Web Components
3. **TDesign** — Alternatif DS lain

### Masalah dengan Signal UI React

Setelah percobaan integrasi `@signal-web-ui/react@0.1.12`, ditemukan beberapa masalah:

1. **Turbopack/Next.js 16 tidak kompatibel** dengan struktur export Stencil — import path `@signal-web-ui/core/dist/custom-elements/*.js` tidak dapat di-resolve.
2. **`transpilePackages`** tidak menyelesaikan masalah karena package Stencil memiliki dependency internal yang kompleks.
3. **Styling system berbeda** — Signal UI menggunakan SCSS/CSS Variables sendiri, tidak kompatibel dengan Tailwind yang sudah menjadi stack utama.

### Solusi yang Berhasil (ADR-0012)

Pendekatan **Radix UI + Signal Design Tokens** terbukti:
- ✅ Berfungsi 100% dengan Turbopack/Next.js 16
- ✅ Lulus typecheck dan lint
- ✅ Sesuai dengan standar visual Telkomsel
- ✅ Kompatibel dengan Tailwind CSS
- ✅ Aksesibilitas bawaan dari Radix primitives

## Keputusan (Diperbarui)

**Gunakan pendekatan ADR-0012: Radix UI + Signal Design Tokens**

```
src/components/ui/
├── primitives/      ← Shadcn-style components (Button, Badge, Card, dll)
├── layout/          ← App-specific composites (ScreenFrame, CountdownCard)
├── signal.css       ← Token warna Signal
└── cn.utils.ts      ← Class merge utility
```

### Komponen yang Tersedia

| Primitif | Varian |
|----------|--------|
| `Button` | default, secondary, outline, ghost, destructive, success, link |
| `Badge` | success, info, warning, error |
| `Card` | CardContent, CardHeader |
| `Alert` | info, warning |
| `Progress` | — |
| `RadioGroup` | — |

### Layout Components

| Komponen | Penggunaan |
|----------|-----------|
| `ScreenFrame` | Kerangka layar: header merek + kartu putih |
| `CountdownCard` | Timer countdown dengan visualisasi |
| `StatusView` | Status screen (success/error) |

### Halaman Demo

- `/ds-sample` — Demonstrasi komponen primitif
- `/signal-demo` — Demonstrasi interaktif (input validation, progress)

## Aturan Penggunaan

1. **JANGAN gunakan `@signal-web-ui/react` langsung** — tidak kompatibel dengan Next.js 16/Turbopack
2. **Gunakan primitif di `src/components/ui/primitives/`**
3. **Token warna Signal** wajib dipakai — tidak ada hex/rgb di `src/modules/*/views`
4. **Tailwind CSS** boleh digunakan bersama token Signal

```tsx
// ✅ Benar — gunakan primitif lokal
import { Button } from "@/components/ui/primitives/Button";
import { Card, CardContent } from "@/components/ui/primitives/Card";

// ❌ Salah — jangan import langsung dari @signal-web-ui/react
import { SignalButton } from "@signal-web-ui/react";
```

## Konsekuensi

- **Positif**: 
  - Tampilan sejalan dengan Signal tanpa masalah bundler
  - Token satu sumber, konsisten
  - Primitif Radix memberi aksesibilitas bawaan
  - Kompatibel penuh dengan Tailwind + Turbopack

- **Negatif / biaya**: 
  - Ini bukan paket Signal resmi — token mengikuti repo referensi
  - Beberapa komponen Signal tidak tersedia (harus dibuat manual)
  - Mode gelap tidak ada

- **Yang harus dijaga**:
  - ESLint melarang hex di `src/modules/*/views`
  - Komponen baru memakai primitif yang ada sebelum membuat gaya sendiri
  - Jika paket Signal resmi kompatibel di masa depan, evaluasi ulang

## Referensi

- [ADR-0012: Signal DS tokens dan primitif](0012-signal-ds-tokens-and-primitives.md) ← **Sumber kebenaran**
- [Signal Design System — Foundation](https://signal-design-system.web.app/foundation/)
- [Signal Design System — Components](https://signal-design-system.web.app/component/)
