---
inclusion: auto
name: Design System
description: Panduan penggunaan Telkomsel Signal Design System (Shadcn + Radix + Signal Theme). Aktifkan saat menulis komponen di src/components/ui, atau src/modules/<m>/views.
---

# Design System Guideline — Telkomsel Signal DS

Stack: **Shadcn/UI + Radix UI** dengan Signal Theme (ADR-0017). Tidak ada paket Signal resmi; token dan primitif diporting dari repo referensi internal (ADR-0012). Hanya tema terang.

## Struktur File

```
src/components/
└── ui/
    ├── signal.css         ← Token warna & tipografi Signal (satu-satunya sumber token)
    ├── cn.utils.ts        ← Utility merge class (clsx + tailwind-merge)
    ├── primitives/        ← Atom: Button, Badge, Card, Alert, Progress, RadioGroup
    └── layout/            ← Komposit: ScreenFrame, CountdownCard, StatusView, ScreenPlaceholder
```

**Aturan dependensi `components/ui/`:**
- Boleh import: React, Radix UI, Tailwind, `class-variance-authority`, `lucide-react`
- **Dilarang** import apapun dari luar `src/components/` (tidak ada import dari `core/`, `modules/`, dll.)
- View di `src/modules/<m>/views/` import primitif via `@/components/ui/`

---

## Token Warna

Token didefinisikan di `src/components/ui/signal.css`. Pakai nama token Tailwind — **jangan pernah pakai hex, rgb(), atau nama warna Tailwind mentah** (`red-500`, `violet-700`, dll.).

### Token Semantik Signal (prefiks `signal-`)

| Token Tailwind | Dipakai untuk |
|---|---|
| `text-signal-text` | Teks utama (navy `#001a41`) |
| `text-muted-foreground` | Teks sekunder (slate `#4e5784`) |
| `text-signal-text-disable` | Teks disabled |
| `text-signal-valid` | Teks/ikon sukses (hijau) |
| `text-signal-error` | Teks/ikon error (merah gelap) |
| `text-signal-info` | Teks/ikon informasi (biru) |
| `text-signal-warning` | Teks/ikon peringatan (oranye) |
| `bg-signal-disable` | Latar belakang halaman (abu-abu muda `#f5f8fa`) |
| `bg-signal-bg-valid` | Latar sukses (hijau pucat) |
| `bg-signal-bg-error` | Latar error (merah pucat) |
| `bg-signal-bg-info` | Latar informasi (biru pucat) |
| `bg-signal-bg-warning` | Latar peringatan (kuning pucat) |
| `bg-signal-warm` | Latar hangat (cream) |
| `bg-brand` | Merah Signal utama (`#ff0025`) — header, CTA primer |
| `bg-brand-dark` | Navy Signal (`#001a41`) — tombol secondary |

### Token Shadcn (semantik shadcn)

| Token Tailwind | Dipakai untuk |
|---|---|
| `bg-primary` / `text-primary-foreground` | Tombol/elemen primer merah Signal |
| `bg-card` / `text-card-foreground` | Surface kartu (putih) |
| `bg-background` | Latar global |
| `text-foreground` | Teks umum di atas latar gelap |
| `border-border` | Border default |
| `bg-muted` / `text-muted-foreground` | Teks/latar subdued |
| `bg-accent` / `text-accent-foreground` | Hover state elemen |
| `bg-destructive` / `text-destructive-foreground` | Aksi destruktif |

### ✅ Benar
```tsx
<p className="type-body1 text-signal-error">Kuota habis.</p>
<div className="bg-signal-bg-error rounded-lg p-4">...</div>
<Button variant="default">Beli Tiket</Button>
```

### ❌ Salah
```tsx
<p className="text-red-600">Kuota habis.</p>          {/* ❌ warna Tailwind mentah */}
<div style={{ background: '#fdddd4' }}>...</div>       {/* ❌ hex inline */}
<div className="bg-[#fdddd4]">...</div>               {/* ❌ arbitrary value */}
```

---

## Tipografi

Pakai kelas skala tipografi Signal — **jangan** pakai `text-sm`, `text-lg`, `font-bold`, atau ukuran font ad hoc.

### Font

| Variabel CSS | Font | Dipakai untuk |
|---|---|---|
| `--font-heading` (class `font-heading`) | Telkomsel Batik Sans | Heading `type-h1`–`type-h6` |
| `--font-sans` (default) | Poppins | Body, title, semua teks lain |

Font di-load lewat `next/font` (self-hosted). **Jangan** pakai `<link>` ke CDN font.

### Skala Tipografi

| Kelas | Font | Size / Line-height | Weight |
|---|---|---|---|
| `type-h1` | Batik Sans | 44px / 56px | 700 |
| `type-h2` | Batik Sans | 32px / 48px | 700 |
| `type-h3` | Batik Sans | 28px / 40px | 700 |
| `type-h4` | Batik Sans | 24px / 40px | 700 |
| `type-h5` | Batik Sans | 18px / 24px | 700 |
| `type-h6` | Batik Sans | 16px / 24px | 700 |
| `type-title-bold` | Poppins | 16px / 24px | 600 |
| `type-title` | Poppins | 16px / 24px | 400 |
| `type-body1-bold` | Poppins | 14px / 20px | 600 |
| `type-body1` | Poppins | 14px / 20px | 400 |
| `type-body1-caps-bold` | Poppins | 14px / 20px | 600 + uppercase |
| `type-body1-caps` | Poppins | 14px / 20px | 400 + uppercase |
| `type-body2-bold` | Poppins | 12px / 20px | 600 |
| `type-body2` | Poppins | 12px / 20px | 400 |
| `type-strike` | Poppins | 12px / 20px | 400 + line-through |

### ✅ Benar
```tsx
<h1 className="type-h2 text-foreground">Pilih Tiket</h1>
<p className="type-body1 text-muted-foreground">Sisa: 2 tiket</p>
<span className="type-body2 text-signal-text-disable">—</span>
```

### ❌ Salah
```tsx
<h1 className="text-3xl font-bold">Pilih Tiket</h1>   {/* ❌ skala Tailwind langsung */}
<p className="text-[14px] leading-5">Sisa: 2 tiket</p> {/* ❌ ukuran ad hoc */}
```

---

## Border Radius

Pakai variabel radius Signal — jangan hardcode nilai.

| Kelas Tailwind | Nilai |
|---|---|
| `rounded-sm` | `calc(var(--radius) - 4px)` = 8px |
| `rounded-md` | `calc(var(--radius) - 2px)` = 10px |
| `rounded-lg` | `var(--radius)` = 12px |
| `rounded-xl` | `calc(var(--radius) + 4px)` = 16px |
| `rounded-2xl` | 20px |
| `rounded-full` | Lingkaran (badge, avatar) |

---

## Primitif (`src/components/ui/primitives/`)

Gunakan primitif yang ada **sebelum** membuat komponen baru. Primitif baru ditambahkan ke folder ini dengan varian Signal, bukan ditulis inline di view.

### `Button`

```tsx
import { Button } from "@/components/ui/primitives";

// Varian: default | secondary | outline | ghost | destructive | success | link
// Ukuran: default (h-10) | sm (h-8) | lg (h-12, 48px — wajib untuk mobile WebView) | icon | icon-lg

<Button variant="default" size="lg">Bayar Sekarang</Button>
<Button variant="outline" size="lg">Kembali</Button>
<Button variant="destructive">Batalkan</Button>
<Button asChild><a href="/home">Kembali ke Beranda</a></Button>  {/* asChild untuk render sebagai <a> */}
```

`size="lg"` wajib untuk tombol utama di halaman Payment (target sentuh 48px, dipakai di WebView mobile).

### `Badge`

```tsx
import { Badge } from "@/components/ui/primitives";

// Varian: default | secondary | outline | success | info | warning | error

<Badge variant="success">Tersedia</Badge>
<Badge variant="error">Habis</Badge>
<Badge variant="warning">Hampir Habis</Badge>
```

### `Card` & `CardContent`

```tsx
import { Card, CardContent } from "@/components/ui/primitives";

<Card>
  <CardContent>
    <p className="type-body1">Konten tiket</p>
  </CardContent>
</Card>
```

### `Alert`

```tsx
import { Alert } from "@/components/ui/primitives";

// Varian: info | success | warning | error
// role default: "status" — pakai role="alert" untuk error yang perlu segera diumumkan

<Alert variant="error" role="alert">Stok habis. Silakan pilih kategori lain.</Alert>
<Alert variant="info">Antrian Anda: nomor 47.</Alert>
```

### `Progress`

```tsx
import { Progress } from "@/components/ui/primitives";

<Progress value={75} aria-label="Kapasitas tersisa 75%" />
```

### `RadioGroup`

```tsx
import { RadioGroup } from "@/components/ui/primitives";
// Berbasis Radix RadioGroup — aksesibilitas keyboard bawaan
```

---

## Komposit Layout (`src/components/ui/layout/`)

### `ScreenFrame`

Kerangka layar utama: header berwarna merek + kartu putih di atas latar `signal-disable`. **Semua layar wajib dibungkus `ScreenFrame`**, kecuali layar loading murni.

```tsx
import { ScreenFrame } from "@/components/ui/layout/ScreenFrame";

// tone: "default" (merah merek) | "success" (hijau) | "danger" (merah galat)

<ScreenFrame title="Pilih Tiket" trailing={<span className="type-body2">Rock Night 2026</span>}>
  {/* konten layar */}
</ScreenFrame>

<ScreenFrame title="Pembayaran Berhasil" tone="success">
  {/* konten sukses */}
</ScreenFrame>

<ScreenFrame title="Sesi Kedaluwarsa" tone="danger">
  {/* konten error/expired */}
</ScreenFrame>
```

### `CountdownCard`

Tampilan countdown (waiting room, payment). Otomatis menjadi merah dan memicu `aria-live="assertive"` saat `urgent={true}` (≤ 60 detik).

```tsx
import { CountdownCard } from "@/components/ui/layout/CountdownCard";

<CountdownCard
  heading="Sisa waktu pembayaran"
  value="08:42"
  hint="Selesaikan sebelum waktu habis"
  urgent={remainingSeconds <= 60}
  urgentMessage="Kurang dari 1 menit! Segera selesaikan pembayaran."
/>
```

### `StatusView`

Layar status generik (loading gagal, error, empty state). Sudah include `ScreenFrame`.

```tsx
import { StatusView } from "@/components/ui/layout/StatusView";

// tone: "neutral" | "error"

<StatusView
  title="Terjadi Kesalahan"
  message="Gagal memuat data event. Coba lagi."
  tone="error"
  action={{ label: "Coba Lagi", onClick: handleRetry }}
/>
```

### `ScreenPlaceholder`

Placeholder saat konten belum tersedia (skeleton state, coming soon).

---

## Dialog & Modal

Gunakan **Radix `Dialog`** — jangan buat ulang secara manual. Radix menyediakan: Escape menutup, `aria-modal`, focus trap, scroll lock, dan fokus kembali ke pemicu saat tutup.

```tsx
import * as Dialog from "@radix-ui/react-dialog";

<Dialog.Root open={open} onOpenChange={setOpen}>
  <Dialog.Trigger asChild>
    <Button>Lihat Detail</Button>
  </Dialog.Trigger>
  <Dialog.Portal>
    <Dialog.Overlay className="fixed inset-0 bg-black/40" />
    <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card rounded-xl p-6 w-full max-w-sm shadow-xl">
      <Dialog.Title className="type-h6">Stok Habis</Dialog.Title>
      <Dialog.Description className="type-body1 text-muted-foreground mt-2">
        Kategori ini sudah tidak tersedia. Pilih kategori lain.
      </Dialog.Description>
      <Dialog.Close asChild>
        <Button variant="outline" size="lg" className="mt-4 w-full">Tutup</Button>
      </Dialog.Close>
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
```

---

## Aksesibilitas

- Pakai elemen semantik: `<button>`, `<nav>`, `<main>`, `<section>`, `<header>` — bukan `<div onClick>`.
- Setiap elemen interaktif bisa dioperasikan dengan keyboard.
- Countdown: `role="timer"` + `aria-live="off"` (agar tidak diumumkan tiap detik). Peringatan kritis lewat live region terpisah `aria-live="assertive"`.
- Alert: `role="status"` untuk info biasa, `role="alert"` untuk error yang perlu segera diumumkan.
- Status loading: `role="status"` + `aria-live="polite"`.
- Target sentuh minimal **44×44px**. Tombol utama mobile pakai `size="lg"` (48px).
- Input wajib punya label. Pesan error dihubungkan lewat `aria-describedby`.
- Gambar dekoratif: `alt=""`.

---

## Tailwind Hanya untuk Layout & Spacing

Tailwind dipakai hanya untuk hal-hal yang **tidak disediakan** token Signal: layout (flex, grid), spacing (gap, padding, margin), ukuran (width, max-width), shadow, z-index.

**Jangan** pakai Tailwind untuk warna, tipografi, atau border radius — gunakan token Signal.

```tsx
{/* ✅ Benar: Tailwind untuk layout, token untuk warna */}
<div className="flex flex-col gap-4 p-5">
  <p className="type-body1 text-muted-foreground">Subtotal</p>
  <p className="type-h5 text-foreground">Rp 500.000</p>
</div>

{/* ❌ Salah: Tailwind untuk warna dan tipografi */}
<div className="flex flex-col gap-4 p-5">
  <p className="text-sm text-gray-500">Subtotal</p>
  <p className="text-lg font-bold text-gray-900">Rp 500.000</p>
</div>
```

---

## Menambah Primitif Baru

1. Buat file di `src/components/ui/primitives/<NamaKomponen>.tsx`.
2. Pakai `cva` + `class-variance-authority` untuk varian.
3. Ekspor tipe via `ComponentProps<"element"> & VariantProps<typeof variantsName>`.
4. Teruskan `...rest` ke elemen akar.
5. Daftarkan di `src/components/ui/primitives/index.ts`.
6. Varian harus menggunakan token Signal, bukan hex.

### Template Primitif

```tsx
import type { ComponentProps } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../cn.utils";

const namaVariants = cva("/* base classes */", {
  variants: {
    variant: {
      default: "bg-primary text-primary-foreground",
      // tambah varian Signal
    },
  },
  defaultVariants: { variant: "default" },
});

export type NamaProps = ComponentProps<"div"> & VariantProps<typeof namaVariants>;

export function Nama({ className, variant, ...props }: NamaProps) {
  return <div data-slot="nama" className={cn(namaVariants({ variant }), className)} {...props} />;
}
```

---

## Referensi

- ADR-0012: Token Signal dan primitif yang diporting
- ADR-0017: Pemilihan Shadcn + Radix UI dengan Signal Theme
- `src/components/ui/signal.css` — definisi token
- `src/components/ui/primitives/` — komponen atom
- `src/components/ui/layout/` — komposit layar
