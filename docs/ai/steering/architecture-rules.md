# Aturan Arsitektur

Ringkasan untuk agent dari [overview](../../architecture/overview.md) dan ADR 0001–0013. Detail dan alasan ada di ADR.

## Aturan dependensi (wajib)

```
apps/web/app → apps/web/features → packages/{ui, api, i18n} → packages/core
```

| Lokasi | Boleh | Dilarang |
|---|---|---|
| `packages/core` | TypeScript murni, `zod` | React, Next, `fetch`, `window`, `Date.now()` langsung (pakai parameter `now`), import package lain |
| `packages/api` | `core`, client HTTP, TanStack Query hooks | React component, `ui`, `features` |
| `packages/ui` | React, Signal DS, Tailwind | Fetch data, hook TanStack Query, import `api` atau `features` |
| `apps/web/features` | `core`, `api`, `ui`, `i18n` | Logika bisnis yang belum ada di `core` |
| `apps/web/app` | Render Container dari `features`, layout | Logika apa pun selain komposisi |

## Larangan keras

- **Jangan membuat class ViewModel, lifecycle buatan, atau Provider per layar.** ViewModel adalah custom hook `use<Screen>ViewModel` (ADR-0003).
- **Jangan menyimpan server state di Context atau global store.** Pakai TanStack Query (ADR-0004).
- **Jangan menghitung countdown dari durasi.** Selalu dari `expiresAt` + offset server, lewat `core/time` (ADR-0005).
- **Jangan memutuskan expired di klien.** Saat timer nol, panggil endpoint status, ikuti jawabannya (ADR-0005).
- **Jangan memanggil Midtrans atau mengimpor SDK-nya.** Pembayaran hanya lewat endpoint BE (ADR-0006).
- **Jangan menaruh token di URL**, kecuali one-time code di alur exchange WebView (ADR-0008).
- **Jangan memasang provider client di root layout.** Home harus tetap statis (ADR-0007).
- **Jangan mengedit `packages/api/generated/`.** Regenerate dari OpenAPI (ADR-0009).

## Aturan tambahan (ditegakkan lint atau CI)

- **`ui` memakai primitif dan token Signal DS (ADR-0012).** Tidak ada nilai hex di `packages/ui` (`bg-primary`, `text-muted-foreground`, `bg-signal-bg-error`, `currentColor`). Tombol, kartu, badge, alert, progress, dan radio dibangun dari `packages/ui/src/primitives`. Hex ditegakkan ESLint.
- **`ui` boleh `import type` dari `core`, bukan nilai.** Ditegakkan ESLint boundaries (ADR-0002).
- **Kode mock hanya dimuat dari `features/shared/AppProviders.tsx`, `instrumentation.ts`, dan test.** Pemuatannya dijaga `NEXT_PUBLIC_API_MOCKING`. `next.config.ts` selalu mendefinisikan variabel itu supaya kode mock hilang dari bundle produksi. Ditegakkan ESLint dan dicek lewat ukuran bundle.
- **Kontrol yang hanya untuk simulasi** (mis. tombol "Simulasikan berhasil/gagal") dirender hanya saat `NEXT_PUBLIC_API_MOCKING=enabled`.
- **Home tetap statis.** CI gagal bila `/` bukan route statis (ADR-0007).
- **Flag `NEXT_PUBLIC_*` baru wajib ditambahkan sebagai `ARG` dan `ENV` di `Dockerfile`**, karena nilainya di-inline saat build. CI gagal bila ada variabel di `apps/web/.env.example` yang tidak ada di `Dockerfile` (ADR-0013).
- **Build tidak boleh mengunduh aset dari internet** selain registry paket (mis. `next/font/google`). Font dan aset di-self-host agar image bisa dibangun di jaringan tertutup (ADR-0013).

## Pola wajib per layar

```
features/<feature>/
├─ use<Screen>ViewModel.ts     state + command, memanggil core dan api
├─ to<Screen>ViewProps.ts      fungsi murni: data domain → props View (format, label i18n, state tombol)
├─ <Screen>Container.tsx       const screen = use<Screen>ViewModel(); render View sesuai screen.kind
└─ __tests__/                  test mapper (tanpa render) dan test ViewModel (Testing Library + MSW)
packages/ui/src/<screen>/
└─ <Screen>View.tsx            props-only, semua state visual punya story
```

## Pengecualian terdokumentasi

| Pengecualian | Alasan | Dicatat di |
|---|---|---|
| Home memakai Container async (Server Component), tanpa hook ViewModel | Hook memaksa Client Component dan merusak render statis | ADR-0003 |
| `proxy.ts`, bukan `middleware.ts` | Konvensi Next 16 | ADR-0007 |
| `/api/session/start` (web) terpisah dari `/api/session/exchange` (WebView) | Kontrak berbeda | ADR-0008 |
| Halaman dengan `params` membungkus isinya dalam `<Suspense>`, dan layout route memasang `AppProviders` | Cache Components Next 16 menuntut akses `params` di dalam Suspense | ADR-0007 |

## Error

- `api` memetakan response gagal ke `AppError` (union bertipe di `core/errors`).
- ViewModel memetakan `AppError` ke key i18n dan state layar.
- Komponen tidak pernah menampilkan `error.message` mentah.

## Jika ragu

Kalau sebuah perubahan butuh melanggar aturan di atas, berhenti dan usulkan ADR baru lewat skill [`write-adr`](../skills/write-adr/SKILL.md).
