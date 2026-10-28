# Aturan Arsitektur

Ringkasan untuk agent dari [overview](../../architecture/overview.md) dan ADR yang berlaku. Struktur dan lapisan: ADR-0013, ADR-0014, ADR-0015 (menggantikan ADR-0001 dan ADR-0002). Detail dan alasan ada di ADR.

## Struktur (ADR-0013)

Satu aplikasi Next.js, bukan monorepo. Fitur adalah **modul vertikal**; tiap modul punya lapisan Clean Architecture sendiri.

```
src/app            Next.js: routing, layout, route handler        (framework)
src/di             composition root Awilix, config, AppProviders  (wiring)
src/modules/<m>/   domain/ application/ infrastructure/ presentation/{views/} <m>.module.ts
src/core/          domain + application bersama (murni, boleh dipakai siapa saja)
src/platform/      infrastructure bersama (HTTP, SSE, sesi)
src/ui/            presentation bersama: design-system/, i18n/, hooks/, di/
src/mocks          MSW
src/test           support test
```

## Aturan dependensi (wajib, ADR-0014)

Arah dependensi selalu ke dalam: `presentation → application (tipe saja) → domain`, `infrastructure → application → domain`. Hanya `src/di` yang merakit implementasi.

| Lokasi | Boleh | Dilarang |
|---|---|---|
| `modules/<m>/domain` | TypeScript murni; `domain` modul sendiri, `core/domain` | React, Next, `zod`, `awilix`, `fetch`, `window`, `Date.now()` (terima `now` sebagai parameter) |
| `modules/<m>/application` | Use case (kelas `execute()`), port (interface), `dependencies.ts`; `domain`/`application` modul sendiri, `core` | Framework, `zod`, `awilix`, `fetch`, `Date.now()`, `Math.random()` |
| `modules/<m>/infrastructure` | Adapter yang mengimplementasikan port, schema zod; lapisan dalam modul sendiri, `core`, `platform` | React, Next, `awilix`, `presentation` |
| `modules/<m>/presentation` | ViewModel, mapper, Container, query options; `domain` modul sendiri, `core/domain`, `ui`, **`application` hanya `import type`** | Impor nilai dari `application` atau `infrastructure`, `awilix`, `Date.now()`, `Math.random()` |
| `modules/<m>/presentation/views` | View props-only; `ui/design-system`; `domain` hanya tipe | i18n, hook data, TanStack Query, apa pun selain design system |
| `modules/<m>/<m>.module.ts` | Registrasi Awilix modul sendiri | Modul lain |
| `src/ui/design-system` | React, Signal DS, Tailwind | Semua di luar `design-system` (termasuk i18n dan hook `ui`) |
| `src/core` | TypeScript murni (`domain`, `application`) | Semua di luar `core`, framework, `zod`, `awilix` |
| `src/platform` | `core`, adapter (HTTP, SSE) | React, `ui`, modul, `awilix` |
| `src/ui` (selain `design-system`) | `core/domain`, `core/application` hanya tipe, `design-system` | `platform`, modul, `awilix` |
| `src/di` | Registrasi modul, `core`, `platform`, `ui`, `awilix` | Presentation modul |
| `src/app`, `proxy.ts`, `instrumentation.ts` | `di`, presentation modul, `ui`, `platform` (konstanta cookie) | Logika apa pun selain komposisi dan kebijakan rendering |

**Modul tidak saling mengimpor.** Yang dipakai lebih dari satu modul pindah ke `src/core` (domain dan application murni), `src/platform` (adapter bersama), atau `src/ui` (presentation bersama dan design system). Kalau terpaksa melanggar, berhenti dan usulkan ADR.

## Aturan SOLID (ADR-0014)

- **SRP**: satu use case satu kelas, satu `execute()`. Mapper murni terpisah dari ViewModel.
- **OCP**: modul baru tidak mengubah modul lain; cukup satu baris di `src/di/container.ts`.
- **LSP**: setiap implementasi port bisa saling ganti (HTTP, fake di test).
- **ISP**: port kecil (`PaymentSimulator` terpisah dari `OrderRepository`). Presentation meminta irisan container (`useCradle<PaymentDependencies & CoreDependencies>()`), bukan seluruh container.
- **DIP**: use case bergantung pada port; presentation menerima use case dari container. Jam, acak, dan konfigurasi diinjeksikan (`clock`, `random`, `appConfig`).

## Dependency injection (ADR-0015)

- Awilix `InjectionMode.PROXY`, `strict: true`. Kelas menerima satu objek dependensi di constructor: `constructor({ eventRepository }: { eventRepository: EventRepository })`.
- `awilix` hanya boleh diimpor dari `src/di` dan `src/modules/<m>/<m>.module.ts`.
- ViewModel: `const { getOrder } = useCradle<PaymentDependencies & CoreDependencies>()`. Selalu destructuring, jangan spread cradle.
- Server Component: route di `app/` memanggil `getServerCradle()` dan meneruskannya ke loader presentation.
- `process.env` hanya dibaca di `src/di/config.ts` (kecuali kondisi literal pemuatan MSW).

## Larangan keras

- **Jangan membuat class ViewModel, lifecycle buatan, atau Provider per layar.** ViewModel adalah custom hook `use<Screen>ViewModel` (ADR-0003).
- **Jangan menyimpan server state di Context atau global store.** Pakai TanStack Query (ADR-0004). Satu-satunya Context adalah `DependencyProvider` (container DI), dan isinya bukan server state.
- **Jangan membuat container Awilix atau memanggil `new` pada use case/adapter di luar `src/di`** (kecuali test application dengan fake).
- **Jangan memakai polling sebagai jalur utama untuk antrian atau status order.** Pembaruan lewat SSE (`useLiveUpdates` + use case `Watch*`); polling hanya cadangan saat stream putus (ADR-0016). Stream ditutup klien di status akhir.
- **Jangan menaruh token di URL stream SSE.** EventSource memakai cookie (`withCredentials`).
- **Jangan menghitung countdown dari durasi.** Selalu dari `expiresAt` + offset server, lewat `src/core/domain/time` (ADR-0005).
- **Jangan memutuskan expired di klien.** Saat timer nol, panggil endpoint status, ikuti jawabannya (ADR-0005).
- **Jangan memanggil Midtrans atau mengimpor SDK-nya.** Pembayaran hanya lewat endpoint BE (ADR-0006).
- **Jangan menaruh token di URL**, kecuali one-time code di alur exchange WebView (ADR-0008).
- **Jangan memasang provider client di root layout.** Home harus tetap statis (ADR-0007).
- **Jangan mengedit `src/platform/http/generated/`.** Regenerate dari OpenAPI (ADR-0009).

## Aturan tambahan (ditegakkan lint atau CI)

- **Seluruh aturan dependensi di atas ditegakkan `eslint.boundaries.mjs`** dengan `default: "disallow"` (ADR-0014). Test (`*.test.*`, `__tests__/`) dikecualikan dari aturan lapisan.
- **Design system memakai primitif dan token Signal DS (ADR-0012).** Tidak ada nilai hex di `src/ui/design-system` maupun `presentation/views` (`bg-primary`, `text-muted-foreground`, `bg-signal-bg-error`, `currentColor`). Tombol, kartu, badge, alert, progress, dan radio dibangun dari `src/ui/design-system/primitives`. Hex ditegakkan ESLint.
- **View boleh `import type` dari `domain` modulnya, bukan nilai.** Ditegakkan ESLint boundaries.
- **Kode mock hanya dimuat dari `src/di/AppProviders.tsx`, `src/instrumentation.ts`, dan test.** Pemuatannya dijaga `NEXT_PUBLIC_API_MOCKING`. `next.config.ts` selalu mendefinisikan variabel itu supaya kode mock hilang dari bundle produksi. Ditegakkan ESLint dan dicek lewat ukuran bundle.
- **Kontrol yang hanya untuk simulasi** (mis. tombol "Simulasikan berhasil/gagal") dirender hanya saat `NEXT_PUBLIC_API_MOCKING=enabled`.
- **Home tetap statis.** CI gagal bila `/` bukan route statis (ADR-0007).

## Pola wajib per modul dan layar

```
src/modules/<m>/
├─ domain/<konsep>.ts            tipe + aturan murni, test di sebelahnya (<konsep>.test.ts)
├─ application/
│  ├─ <Nama>Repository.ts        port (interface)
│  ├─ <KataKerja><Benda>.ts      use case: kelas, constructor({ deps }), execute(...)
│  └─ dependencies.ts            type <M>Dependencies = irisan container untuk presentation
├─ infrastructure/Http<Nama>Repository.ts   implementasi port + schema zod
├─ presentation/
│  ├─ <m>Queries.ts              queryOptions + query key (memanggil use case)
│  ├─ use<Screen>ViewModel.ts    useCradle → useQuery/useMutation → state + command
│  ├─ to<Screen>ViewProps.ts     fungsi murni: data domain → props View (format, label i18n, state tombol)
│  ├─ <Screen>Container.tsx      const screen = use<Screen>ViewModel(); render View sesuai screen.kind
│  ├─ views/<Screen>View.tsx     props-only, semua state visual punya story
│  └─ __tests__/                 test mapper (tanpa render) dan ViewModel (Testing Library + MSW + container uji)
└─ <m>.module.ts                 <m>Module(): registrasi Awilix; type <M>Cradle
```

## Pengecualian terdokumentasi

| Pengecualian | Alasan | Dicatat di |
|---|---|---|
| Home tidak memakai hook ViewModel: route `app/(public)/page.tsx` memegang `"use cache"` dan memanggil `loadHomeViewProps(getServerCradle())` | Hook memaksa Client Component dan merusak render statis; kebijakan cache milik framework | ADR-0003, ADR-0015 |
| `proxy.ts`, bukan `middleware.ts` | Konvensi Next 16 | ADR-0007 |
| `/api/session/start` (web) terpisah dari `/api/session/exchange` (WebView) | Kontrak berbeda | ADR-0008 |
| Halaman dengan `params` membungkus isinya dalam `<Suspense>`, dan layout route memasang `AppProviders` (dari `src/di`) | Cache Components Next 16 menuntut akses `params` di dalam Suspense | ADR-0007 |
| Sesi/access token (`StartSession`, `SessionGateway`) ada di `src/core` (adapternya di `src/platform`), bukan modul | Dipakai Waiting Room dan nanti login; modul tidak boleh saling mengimpor | ADR-0014 |

## Error

- `infrastructure` memetakan response gagal ke `AppError` (union bertipe di `src/core/domain/errors`) lewat `FetchHttpClient`.
- ViewModel memetakan `AppError` ke key i18n dan state layar.
- Komponen tidak pernah menampilkan `error.message` mentah.

## Jika ragu

Kalau sebuah perubahan butuh melanggar aturan di atas, berhenti dan usulkan ADR baru lewat skill [`write-adr`](../skills/write-adr/SKILL.md).
