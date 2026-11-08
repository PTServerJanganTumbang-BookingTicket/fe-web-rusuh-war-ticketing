# ADR-0024: Komponen UI baru memakai shadcn/ui gaya `base-mira` di atas Base UI, dengan token Signal

- **Status**: Proposed
- **Tanggal**: 2026-11-04
- **Pengambil keputusan**: Tim FE Web (Ahmad Muzaki)
- **Requirement terkait**: NFR-08 (aksesibilitas dan branding Signal), [ADR-0012](0012-signal-ds-tokens-and-primitives.md), [ADR-0017](0017-design-system-selection.md)

## Konteks

ADR-0012 dan ADR-0017 memutuskan token Signal DS plus primitif buatan sendiri yang diporting dari shadcn/Radix (`src/components/ui/primitives/`: `Button`, `Badge`, `Card`, `Alert`, `Progress`, `RadioGroup`). Primitif itu cukup untuk layar awal, tetapi layar auth, Waiting Room, Detail Tiket, dan Pembayaran butuh komponen yang belum ada: input dengan label dan pesan galat, checkbox, dialog, separator, dan spinner. Menulisnya sendiri berarti mengulang perilaku aksesibilitas (fokus, `aria-*`, jebakan fokus dialog) yang sudah ada di pustaka.

Pada 2026-11-03 tim menjalankan `npx shadcn@latest init` dan menambah komponen shadcn (lihat `.kiro/usage-log.md`, entri "Desain Waiting Room dan layar auth dengan shadcn"). ADR ini mencatat keputusan itu dan cara pemasangannya di repo, karena belum ada ADR yang menjelaskannya.

Kondisi di repo saat ADR ini ditulis:

- **`components.json`**: `"style": "base-mira"` (varian shadcn yang dibangun di atas Base UI, bukan Radix), `"rsc": true`, `"tsx": true`, `"iconLibrary": "lucide"`, Tailwind v4 tanpa file config (`"config": ""`) dengan CSS di `src/app/globals.css`, `"cssVariables": true`, `"baseColor": "mauve"`. Alias: `ui` dan `lib` ke `@/components/ui`, `utils` ke `@/components/ui/cn.utils`, `hooks` ke `@/core/controllers`.
- **`package.json`**: `@base-ui/react` ^1.9.0 (terpasang 1.9.0), `shadcn` ^4.23.0 sebagai dependency runtime karena `globals.css` mengimpor `shadcn/tailwind.css`, `cn` ^0.5.2 (pengganti `clsx` + `tailwind-merge` dari tim shadcn), `class-variance-authority`, `lucide-react`, dan `tw-animate-css`. `radix-ui` ^1.8.1 masih ada karena primitif ADR-0012 memakainya (`Slot` di `Button`, `Progress`, `RadioGroup`).
- **Komponen shadcn** di `src/components/ui/*.tsx`: `button`, `badge`, `checkbox`, `dialog`, `input`, dan `separator` memakai Base UI (`@base-ui/react/button`, `.../dialog`, `.../checkbox`, `.../input`, `.../separator`, `useRender` dan `mergeProps` untuk `badge`); `alert`, `card`, `field`, `label`, dan `spinner` hanya markup dan kelas.
- **Token**: `globals.css` mengimpor `signal.css` lalu `shadcn/tailwind.css`. Warna, radius, dan font tetap dari `src/components/ui/signal.css` (ADR-0012); preset shadcn tidak menimpa tema.
- **Pemakai**: view modul `auth`, `booking`, `payment`, dan `queue`. Primitif ADR-0012 masih dipakai `ticket`, `catalog`, sebagian `auth`, dan komponen layout (`StatusView`, `ScreenFrame`).

## Opsi yang dipertimbangkan

1. **Tetap hanya primitif buatan sendiri (ADR-0012), menambah komponen baru dengan tangan.** Tidak ada dependency baru. Setiap komponen interaktif (dialog, checkbox) harus menulis ulang manajemen fokus dan atribut ARIA, dan tidak ada jalur pembaruan dari hulu.
2. **shadcn/ui gaya Radix (`new-york`).** Sejalan dengan `radix-ui` yang sudah terpasang. Proyek shadcn kini menyediakan Base UI sebagai pilihan utama untuk gaya baru, dan tim memilih preset `base-mira` saat init, jadi opsi ini berarti menolak preset yang sudah dipakai layar auth dan Waiting Room.
3. **shadcn/ui gaya `base-mira` di atas Base UI, dengan token Signal** (dipilih). Komponen disalin ke repo (bukan paket tertutup), jadi bisa disesuaikan ke Signal. Base UI memberi perilaku aksesibel untuk dialog, checkbox, dan input. Biayanya dua pustaka headless hidup berdampingan (Base UI untuk komponen shadcn, Radix untuk primitif lama) sampai migrasi selesai.
4. **Pustaka komponen lengkap lain (MUI, Chakra, Mantine).** Tema bawaannya kuat dan sulit dibengkokkan ke Signal, dan bentrok dengan Tailwind yang sudah menjadi stack.

## Keputusan

**Komponen UI baru diambil dari shadcn/ui gaya `base-mira` (Base UI) lewat `components.json`, disimpan di `src/components/ui/`, dan memakai token Signal dari `signal.css`.**

1. **Tambah komponen dengan CLI**, misalnya `npx shadcn@latest add select`, lalu sesuaikan ukuran dan warna ke Signal (kontrol 40px, teks 14px, tombol nonaktif abu-abu) seperti komponen yang sudah ada.
2. **Token tidak ditimpa.** `npx shadcn add` tidak boleh mengubah token di `globals.css` atau `signal.css`. Bila CLI menambah variabel tema, kembalikan ke token Signal sebelum commit.
3. **Primitif ADR-0012 tetap berlaku** untuk layar yang sudah memakainya. Layar baru dan layar yang didesain ulang memakai komponen shadcn. Dua `Button` (`primitives/Button` dan `ui/button`) sementara hidup bersama; view baru memilih salah satu set, bukan mencampur keduanya.
4. **Dialog dan popup** memakai `Dialog` dari `src/components/ui/dialog.tsx` (Base UI). Perilaku yang dituntut steering (Escape menutup, `aria-modal`, jebakan fokus, kunci scroll, fokus kembali ke pemicu) datang dari Base UI.
5. **Batas lapisan tidak berubah.** Komponen shadcn adalah bagian design system (`src/components/ui/**` di `eslint.boundaries.mjs`): tidak boleh mengimpor i18n, controller, atau modul. View modul hanya memakainya lewat props.
6. **Ikon** dari `lucide-react` sesuai `iconLibrary` di `components.json`.

## Konsekuensi

- **Positif**: Komponen interaktif mendapat aksesibilitas dari Base UI tanpa ditulis ulang. Kode komponen ada di repo dan bisa disesuaikan ke Signal. Menambah komponen cukup satu perintah CLI.
- **Negatif / biaya**:
  - Dua pustaka headless (`@base-ui/react` dan `radix-ui`) dan dua set komponen dasar sampai primitif ADR-0012 dimigrasikan. Bundle sedikit lebih besar dan reviewer harus tahu mana yang dipakai.
  - `shadcn` menjadi dependency runtime hanya untuk `shadcn/tailwind.css`.
  - Komponen hasil CLI mengimpor `cn` dari paket `cn`, sementara alias `utils` di `components.json` menunjuk `@/components/ui/cn.utils` (dipakai primitif dan view). Keduanya menggabungkan kelas Tailwind dengan cara yang sama, tetapi ada dua sumber. Menyatukannya adalah pekerjaan lanjutan.
  - Gaya `base-mira` dan `baseColor` `mauve` hanya relevan untuk CLI; warna akhir tetap Signal, jadi tampilan default shadcn di dokumentasinya tidak sama dengan tampilan aplikasi.
- **Yang harus dijaga**:
  - ESLint (`eslint.boundaries.mjs`) melarang literal hex di `src/components/ui`, `src/core/views`, dan view modul (ADR-0012); warna Tailwind mentah dijaga lewat review. Token tetap dari `signal.css`.
  - `eslint.boundaries.mjs` (elemen `design-system`) hanya mengizinkan `src/components/ui/**` mengimpor dirinya sendiri, jadi komponen tidak bisa mengimpor modul, i18n, atau controller.
  - Review PR memeriksa diff `globals.css` dan `signal.css` setiap kali `npx shadcn add` dijalankan.
  - Migrasi primitif ADR-0012 ke komponen shadcn dicatat sebagai pekerjaan lanjutan; bila selesai, `radix-ui` dihapus dan ADR-0012 diperbarui statusnya.
