---
inclusion: auto
name: Architecture Rules
description: Lapisan, aturan dependensi, DI, larangan keras, dan pola per modul. Aktifkan saat menulis atau mengedit kode di src/modules, src/core, atau src/di.
---

# Aturan Arsitektur

Ringkasan untuk agent dari [overview](../../docs/architecture/overview.md) dan ADR yang berlaku. Struktur dan lapisan: ADR-0013, ADR-0014, ADR-0015 (menggantikan ADR-0001 dan ADR-0002). Detail dan alasan ada di ADR.

## Struktur (ADR-0013)

Satu aplikasi Next.js, bukan monorepo. Fitur adalah **modul**; tiap modul punya lima lapisan yang sama, dan kode bersama di `src/core` memakai lapisan yang sama juga.

```
src/app            Next.js: routing, layout, route handler        (framework)
src/di             composition root Awilix, config, AppProviders  (wiring)
src/modules/<m>/   domain/ application/ data/ controllers/ views/ <m>.module.ts
src/core/          domain/ application/ data/ controllers/ i18n/   (dipakai lebih dari satu modul; tanpa views)
src/components/ui  design system Signal: primitif, layout, ikon Signal, skeleton (props-only)
src/mocks          MSW
src/test           support test
```

## Istilah

| Istilah | Artinya | Contoh |
|---|---|---|
| Model | Tipe data domain (`*.model.ts`) | `Order` |
| Rules | Fungsi bisnis murni (`*.rules.ts`, `*.reducer.ts`) | `canAddTicket` |
| Constants | Angka bisnis dengan rujukan requirement/ADR (`*.constants.ts`) | `MAX_TICKETS_PER_NIK` |
| Protocol | Interface yang dibutuhkan use case, di `domain/` (`*.protocol.ts`) | `OrderProtocol` |
| Use case | Satu aksi, fungsi dari factory `create<Nama>UseCase` (`*.use-case.ts`) | `createStartPaymentUseCase` → `StartPaymentUseCase` |
| Service | Implementasi protocol di `data/` (`*.service.ts`) | `HttpOrderService` |
| Client | Transport di `core/data` yang dipakai service (`*.client.ts`) | `HttpClient` |
| Schema | Schema zod response BE (`*.schema.ts`) | `orderSchema` |
| Controller | Hook React per layar (`*.controller.ts`) | `usePaymentController` |
| Mapper | Data domain → props View (`*.mapper.ts`) | `toPaymentViewProps` |
| Container | Komponen yang memanggil controller dan memilih View | `PaymentContainer` |
| View | Komponen props-only | `PaymentView` |
| Registry | Semua yang didaftarkan modul ke container | `PaymentRegistry` |
| Dependencies | Irisan container yang boleh diminta controller (`*.dependencies.ts`) | `PaymentDependencies` |

## Aturan dependensi (wajib, ADR-0014)

Arah dependensi selalu ke dalam: `views → controllers → application (tipe saja) → domain`, `data → application → domain`. Hanya `src/di` yang memasangkan service ke protocol.

| Lokasi | Boleh | Dilarang |
|---|---|---|
| `modules/<m>/domain` | TypeScript murni; `domain` modul sendiri, `core/domain` | React, Next, `zod`, `awilix`, `fetch`, `window`, `Date.now()` (terima `now` sebagai parameter) |
| `modules/<m>/application` | Use case (factory `create<Nama>UseCase`), `<m>.dependencies.ts`; `domain`/`application` modul sendiri, `core/domain`, `core/application` | Framework, `zod`, `awilix`, `fetch`, `Date.now()`, `Math.random()` |
| `modules/<m>/data` | Service yang mengimplementasikan protocol, schema zod; lapisan dalam modul sendiri, `core/domain`, `core/application`, `core/data` | React, Next, `awilix`, `controllers`, `views` |
| `modules/<m>/controllers` | Controller, mapper, query options, loader; `domain` modul sendiri, `views` modul sendiri (tipe props), `core` sisi tampilan, **`application` hanya `import type`** | Impor nilai dari `application` atau `data`, `awilix`, `Date.now()`, `Math.random()` |
| `modules/<m>/views/<Layar>Container.tsx` | Sama dengan `controllers` | Sama dengan `controllers` |
| `modules/<m>/views` (selain Container) | View props-only; `components/ui`; `domain` hanya tipe | Controller, i18n, hook data, TanStack Query, apa pun selain design system |
| `modules/<m>/<m>.module.ts` | Registrasi Awilix modul sendiri | Modul lain |
| `src/components/ui` | React, Signal DS, Tailwind | Semua di luar `design-system` (termasuk i18n dan hook `core/controllers`) |
| `src/core/domain`, `src/core/application` | TypeScript murni | Semua di luar `core/domain` dan `core/application`, framework, `zod`, `awilix` |
| `src/core/data` | `core/domain`, `core/application`, client (HTTP, SSE) | React, `core/controllers`, design system, modul, `awilix` |
| `src/core/controllers`, `src/core/i18n` | `core/domain`, `core/application` hanya tipe | `core/data`, modul, `awilix` |
| `src/di` | Registrasi modul, seluruh `core`, `awilix` | Controller dan view modul |
| `src/app`, `proxy.ts`, `instrumentation.ts` | `di`, controller dan view modul, `core` sisi tampilan, `core/data` (konstanta cookie) | Logika apa pun selain komposisi dan kebijakan rendering |

"`core` sisi tampilan" berarti `core/domain`, `core/controllers`, `core/i18n`, dan design system `src/components/ui`.

`src/core` tidak punya `views/`. Komponen tampilan bersama (termasuk `ScreenLoading`, `PageSkeleton`, `StatusView`) ada di design system dan props-only; teksnya dari pemanggil. Layar milik modul, misalnya Pusat Bantuan di `src/modules/help`. Kerangka memuat memakai `Skeleton` dan `PageSkeleton` dengan varian sesuai tata letak layar; spinner hanya untuk tombol yang sedang memproses.

**Modul tidak saling mengimpor.** Yang dipakai lebih dari satu modul pindah ke lapisan yang sama di `src/core`. Kalau terpaksa melanggar, berhenti dan usulkan ADR.

## Nama file (ADR-0013)

- File non-komponen: kebab-case dengan akhiran peran (`start-payment.use-case.ts`, `http-order.service.ts`, `order.schema.ts`). Daftar akhiran lengkap ada di ADR-0013 dan [coding-conventions](coding-conventions.md).
- Komponen React: PascalCase (`PaymentView.tsx`, `PaymentContainer.tsx`).
- Test di folder `__tests__` di sebelah file yang dites (ADR-0020): `controllers/__tests__/payment.mapper.test.ts`, `controllers/__tests__/payment.controller.test.tsx`.

## Service dan schema (ADR-0014)

- Satu protocol per sumber daya BE, ditambah protocol terpisah untuk stream SSE dan untuk endpoint khusus mock (ISP).
- Service hanya memanggil `HttpClient` atau `EventStreamClient` dan mem-parse dengan schema dari `data/<nama>.schema.ts`. URL dasar, header, dan pemetaan error adalah tugas client.
- Schema ditulis `satisfies z.ZodType<Model>`. Schema yang mengubah bentuk memakai `.transform()` dengan tipe hasil eksplisit.

## Konstanta (ADR-0014)

- Angka bisnis dan interval di `domain/<m>.constants.ts`, atau `core/domain` bila dipakai lebih dari satu modul. Setiap konstanta punya komentar rujukan requirement atau ADR.
- Nilai yang berbeda per environment ada di `AppConfig` (`src/di/app-config.reader.ts`), bukan konstanta.

## Aturan SOLID (ADR-0014)

- **SRP**: satu use case satu fungsi. Mapper murni terpisah dari controller.
- **OCP**: modul baru tidak mengubah modul lain; cukup satu baris di `src/di/container.ts`.
- **LSP**: setiap implementasi protocol bisa saling ganti (service HTTP, fake di test).
- **ISP**: protocol kecil (`PaymentSimulatorProtocol` terpisah dari `OrderProtocol`). Controller meminta irisan container (`useDependencies<PaymentDependencies & CoreDependencies>()`), bukan seluruh container.
- **DIP**: use case bergantung pada protocol; controller menerima use case dari container. Jam, acak, dan konfigurasi diinjeksikan (`clock`, `random`, `appConfig`).

## Dependency injection (ADR-0015)

- Awilix `InjectionMode.PROXY`, `strict: true`. Factory use case dan service menerima satu objek dependensi: `createListEventsUseCase({ eventService }: { eventService: EventProtocol })`, didaftarkan dengan `asFunction`.
- `awilix` hanya boleh diimpor dari `src/di` dan `src/modules/<m>/<m>.module.ts`.
- Nama registrasi: use case `<x>UseCase`, protocol `<x>Service`, sisanya kata benda pendek (`clock`, `random`, `appConfig`, `httpClient`).
- Controller: `const { getOrderUseCase } = useDependencies<PaymentDependencies & CoreDependencies>()`. Selalu destructuring, jangan spread.
- Server Component: route di `app/` memanggil `getServerDependencies()` dan meneruskannya ke loader di `controllers/`.
- `process.env` hanya dibaca di `src/di/app-config.reader.ts` (kecuali kondisi literal pemuatan MSW).

## Larangan keras

- **Jangan membuat class controller, lifecycle buatan, atau Provider per layar.** Controller adalah custom hook `use<Layar>Controller` (ADR-0003; dulu disebut ViewModel).
- **Jangan menyimpan server state di Context atau global store.** Pakai TanStack Query (ADR-0004). Satu-satunya Context adalah `DependencyProvider` (container DI), dan isinya bukan server state.
- **Jangan membuat container Awilix atau memanggil `new` pada use case/service di luar `src/di`** (kecuali test application dengan fake).
- **Jangan memakai polling sebagai jalur utama untuk antrian atau status order.** Pembaruan lewat SSE (`useLiveUpdates` + use case `Watch*UseCase`); polling hanya cadangan saat stream putus (ADR-0016). Stream ditutup klien di status akhir.
- **Jangan menaruh token di URL stream SSE.** EventSource memakai cookie (`withCredentials`).
- **Jangan menghitung countdown dari durasi.** Selalu dari `expiresAt` + offset server, lewat `src/core/domain/time` (ADR-0005).
- **Jangan memutuskan expired di klien.** Saat timer nol, panggil endpoint status, ikuti jawabannya (ADR-0005).
- **Jangan memanggil Midtrans atau mengimpor SDK-nya.** Pembayaran hanya lewat endpoint BE (ADR-0006).
- **Jangan menaruh token di URL**, kecuali one-time code di alur exchange WebView (ADR-0008).
- **Jangan memasang provider client di root layout.** Home harus tetap statis (ADR-0007).
- **Jangan mengedit `src/core/data/http/generated/`.** Regenerate dari OpenAPI (ADR-0009).
- **Jangan menulis angka bisnis langsung di controller, mapper, atau query.** Taruh di `*.constants.ts` (ADR-0014).

## Aturan tambahan (ditegakkan lint atau CI)

- **Seluruh aturan dependensi di atas ditegakkan `eslint.boundaries.mjs`** dengan `default: "disallow"` (ADR-0014). Test (`*.test.*`) dikecualikan dari aturan lapisan.
- **Design system memakai primitif dan token Signal DS (ADR-0012).** Tidak ada nilai hex di `src/components/ui` maupun `src/modules/<m>/views` (`bg-primary`, `text-muted-foreground`, `bg-signal-bg-error`, `currentColor`). Tombol, kartu, badge, alert, progress, dan radio dibangun dari `src/components/ui/primitives`. Hex ditegakkan ESLint. Komponen shadcn dari `components.json` (style `base-mira`, Base UI) ada di `src/components/ui/*.tsx` dan dipakai layar baru (auth, Waiting Room); token warnanya tetap dari `src/components/ui/signal.css`, jadi `npx shadcn add` tidak boleh menimpa token di `globals.css`.
- **View boleh `import type` dari `domain` modulnya, bukan nilai.** Ditegakkan ESLint boundaries.
- **Kode mock hanya dimuat dari `src/di/AppProviders.tsx`, `src/instrumentation.ts`, dan test.** Pemuatannya dijaga `NEXT_PUBLIC_API_MOCKING`. `next.config.ts` selalu mendefinisikan variabel itu supaya kode mock hilang dari bundle produksi. Ditegakkan ESLint dan dicek lewat ukuran bundle.
- **Kontrol yang hanya untuk simulasi** (mis. tombol "Simulasikan berhasil/gagal") dirender hanya saat `NEXT_PUBLIC_API_MOCKING=enabled`.
- **Home tetap statis.** CI gagal bila `/` bukan route statis (ADR-0007).

## Pola wajib per modul dan layar

```
src/modules/<m>/
├─ domain/
│  ├─ <konsep>.model.ts             tipe
│  ├─ <konsep>.rules.ts             fungsi bisnis murni, test di sebelahnya
│  ├─ <m>.constants.ts              angka bisnis + rujukan requirement/ADR
│  └─ <nama>.protocol.ts            interface <Nama>Protocol
├─ application/
│  ├─ <kata-kerja>-<benda>.use-case.ts   create<KataKerja><Benda>UseCase({ deps }) → fungsi use case
│  └─ <m>.dependencies.ts           type <M>Dependencies = irisan container untuk controller
├─ data/
│  ├─ http-<nama>.service.ts        createHttp<Nama>Service({ deps }): <Nama>Protocol
│  └─ <nama>.schema.ts              schema zod, satisfies z.ZodType<Model>
├─ controllers/
│  ├─ <m>.queries.ts                queryOptions + query key (memanggil use case)
│  ├─ <m>.controller.ts             use<Layar>Controller: useDependencies → useQuery/useMutation → state + command
│  ├─ <m>.mapper.ts                 to<Layar>ViewProps: data domain → props View (format, label i18n, state tombol)
│  └─ *.test.ts(x)                  test mapper (tanpa render) dan controller (Testing Library + MSW + container uji)
├─ views/
│  ├─ <Layar>Container.tsx          const screen = use<Layar>Controller(); render View sesuai screen.kind
│  └─ <Layar>View.tsx               props-only, semua state visual punya story
└─ <m>.module.ts                    <m>Module(): registrasi Awilix; type <M>Registry
```

## Pengecualian terdokumentasi

| Pengecualian | Alasan | Dicatat di |
|---|---|---|
| Home tidak memakai hook controller: route `app/(public)/page.tsx` memegang `"use cache"` dan memanggil `loadHomeViewProps(getServerDependencies())` dari `catalog/controllers/home.loader.ts` | Hook memaksa Client Component dan merusak render statis; kebijakan cache milik framework | ADR-0003, ADR-0015 |
| `proxy.ts`, bukan `middleware.ts` | Konvensi Next 16 | ADR-0007 |
| `/api/session/start` (web) terpisah dari `/api/session/exchange` (WebView) | Kontrak berbeda | ADR-0008 |
| Halaman dengan `params` membungkus isinya dalam `<Suspense>`, dan layout route memasang `AppProviders` (dari `src/di`) | Cache Components Next 16 menuntut akses `params` di dalam Suspense | ADR-0007 |
| Sesi/access token (`StartSessionUseCase`, `SessionProtocol`) ada di `src/core` (service-nya di `src/core/data/session`), bukan modul | Dipakai Waiting Room dan nanti login; modul tidak boleh saling mengimpor | ADR-0014 |
| `src/di`, `src/mocks`, `src/test` tanpa akhiran peran | Sedikit file dengan satu tugas masing-masing | ADR-0013 |

## Error

- `FetchHttpClient` di `core/data/http` memetakan response gagal ke `AppError` (union bertipe di `src/core/domain/app-error.ts`). Service tidak menangkap error.
- Controller memetakan `AppError` ke key i18n dan state layar.
- Komponen tidak pernah menampilkan `error.message` mentah.

## Jika ragu

Kalau sebuah perubahan butuh melanggar aturan di atas, berhenti dan usulkan ADR baru lewat skill [`write-adr`](../skills/write-adr/SKILL.md).
