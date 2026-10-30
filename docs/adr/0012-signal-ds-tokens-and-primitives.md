# ADR-0012: Signal DS lewat preset token dan primitif yang diporting dari repo referensi

- **Status**: Proposed
- **Tanggal**: 2026-10-19
- **Pengambil keputusan**: Tim FE Web
- **Requirement terkait**: Stack wajib: Telkomsel Signal Design System dan Tailwind (jawaban klien), [ADR-0002](0002-layered-clean-architecture.md), pertanyaan terbuka overview §7 ("apakah Signal DS menyediakan Tailwind preset")

## Konteks

Stack klien mewajibkan Telkomsel Signal Design System. Pencarian di web publik dan npm tidak menemukan paket resmi atau preset Tailwind Signal. Yang ada adalah implementasi referensi milik tim (internal, di luar repo ini): token warna Signal (`--signal-*`), skala tipografi, radius, font (Poppins dan Telkomsel Batik Sans), dan primitif UI berbasis shadcn/Radix yang diselaraskan dengan token itu, serta pola layout (header berwarna merek + kartu putih di atas latar `#f5f8fa`).

Sebelumnya `packages/ui` memakai token placeholder buatan sendiri.

## Opsi yang dipertimbangkan

1. **Menunggu paket Signal resmi.** Tidak ada tanggal, dan pekerjaan UI terhenti. Ditolak.
2. **Token placeholder sendiri (kondisi sebelumnya).** Tidak menyerupai Signal, dan warna harus diganti ulang nanti. Ditolak.
3. **Memporting token, tipografi, dan primitif dari repo referensi ke monorepo ini.** Tampilan sudah Signal, struktur token tetap satu sumber, dan penggantian ke paket resmi kelak terbatas pada preset dan primitif.
4. **Bergantung langsung pada repo referensi.** Repo itu aplikasi (bukan paket) dan membawa kode yang tidak relevan. Ditolak.

## Keputusan

Opsi 3, hanya tema terang.

- **Preset token** ada di `packages/config/tailwind/signal.css` (diimpor `apps/web/app/globals.css`): token `--signal-*`, token semantik shadcn dalam oklch, radius, pemetaan Tailwind (`bg-primary`, `text-muted-foreground`, `bg-signal-bg-error`, `bg-brand`, dst.), dan kelas skala tipografi `.type-h1` … `.type-strike`.
- **Font**: Poppins lewat `next/font/google` dan Telkomsel Batik Sans lewat `next/font/local` (`apps/web/app/fonts/*.woff2`), diekspos sebagai `--font-poppins` dan `--font-batik`. Preset hanya merujuk variabel itu.
- **Primitif** di `packages/ui/src/primitives/`: `Button` (varian default, secondary, outline, ghost, destructive, success, link; ukuran `lg` setinggi 48px untuk target sentuh), `Badge` (varian success, info, warning, error), `Card`, `Alert`, `Progress`, `RadioGroup`. Diadaptasi dari shadcn/Radix dengan varian Signal. `Alert` dan `Card` disederhanakan dibanding repo referensi.
- **Layout**: `ScreenFrame` mengikuti pola `AuthLayout`/`KioskLayout` referensi: header merah merek (hijau untuk berhasil, merah galat untuk gagal), isi dalam kartu putih, latar `signal-disable`.
- Semua view di `packages/ui` dibangun dari primitif dan token ini. Tidak ada warna mentah.

## Konsekuensi

- **Positif**: tampilan sejalan dengan Signal tanpa menunggu paket resmi. Token satu sumber, penggantian ke preset resmi tidak menyentuh view. Primitif Radix memberi aksesibilitas bawaan (radio group, progress).
- **Negatif / biaya**: ini bukan paket resmi, jadi nilai token mengikuti repo referensi dan bisa menyimpang dari spesifikasi Signal terbaru. Tambahan dependensi di `packages/ui`: `radix-ui`, `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`. Mode gelap tidak ada.
- **Yang harus dijaga**:
  - ESLint melarang hex di `packages/ui` (konvensi token).
  - Komponen baru memakai primitif yang ada sebelum membuat gaya sendiri. Primitif baru diporting dengan pola yang sama dan varian Signal.
  - Saat paket atau preset Signal resmi tersedia, ganti `signal.css` dan primitif, lalu jalankan e2e (Playwright) untuk regresi.
- **Pertanyaan terbuka**:
  - Apakah ada paket, Figma, atau spesifikasi token Signal resmi untuk memverifikasi nilai yang diporting?
  - **Lisensi font.** Telkomsel Batik Sans adalah font milik Telkomsel. File yang dipakai diambil dari repo referensi. Konfirmasi izin penggunaan dan redistribusinya sebelum repo ini dipublikasikan.

## Catatan implementasi (2026-10-28)

- Preset token pindah ke `src/core/views/design-system/signal.css`, primitif ke `src/core/views/design-system/primitives`, kerangka layar (`ScreenFrame`, `CountdownCard`, `StatusView`, `ScreenPlaceholder`) ke `src/core/views/design-system/layout`. View per layar ada di `src/modules/<m>/views`. Larangan hex berlaku untuk keduanya.

## Catatan implementasi (2026-10-30)

Struktur UI dipindahkan ke `src/components/ui/`:

```
src/components/
└── ui/
    ├── primitives/      ← Shadcn-style components (Button, Badge, Card, dll)
    ├── layout/          ← App-specific composites (ScreenFrame, CountdownCard)
    ├── signal.css       ← Token warna Signal
    └── cn.utils.ts      ← Class merge utility
```

**Alasan pemindahan:**
- `components/ui/` = UI components, terpisah dari business logic di `core/`
- `core/` sekarang hanya berisi shared business logic (domain, application, data, controllers)
- `core/views/` hanya menyimpan `ScreenLoading.tsx` (minimal loading indicator)

**Aturan dependensi:**
- `components/ui/` boleh import: React, Radix UI, Tailwind
- `components/ui/` dilarang import: apapun di luar `components/`
- View di `modules/<m>/views/` boleh import: `@/components/ui/`
