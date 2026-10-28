# Routing dan Implementasi Clean Architecture di Next.js

Status: **mengikuti kode per 2026-10-28** (setelah restrukturisasi ADR-0013–0015). Ringkasan lapisan ada di [overview](overview.md). Dokumen ini menjelaskan bagaimana lapisan itu benar-benar dipasang di Next.js 16 (App Router): peta route, layout, rendering, gerbang akses, dan alur data dari route sampai backend.

## 1. Peta route

| Route | File | Rendering | Gerbang `proxy.ts` | Isi |
|---|---|---|---|---|
| `/` | `src/app/(public)/page.tsx` | Static shell + `use cache` (ISR 15 dtk) | Tidak | `HomeView` + `loadHomeViewProps(getServerCradle())` (Server Component) |
| `/login` | `src/app/(auth)/login/page.tsx` | Server Component | Tidak | `LoginContainer` (**placeholder**, lihat [auth](auth-login-register.md)) |
| `/events/[eventId]/queue` | `src/app/events/[eventId]/queue/` | Shell statis + client polling | Tidak | `QueueContainer` |
| `/events/[eventId]/book` | `src/app/events/[eventId]/book/` | Dinamis | **Ya** | `BookingContainer` |
| `/orders/[orderId]/pay` | `src/app/orders/[orderId]/pay/` | Dinamis | **Ya** | `PaymentContainer` (web) |
| `/m/orders/[orderId]/pay` | `src/app/(embed)/m/orders/[orderId]/pay/` | Dinamis | Belum (lihat §5) | `PaymentContainer` yang sama, layout embed |
| `/orders/[orderId]/ticket` | `src/app/orders/[orderId]/ticket/page.tsx` | Dinamis | Tidak | `TicketContainer` (placeholder) |
| `POST /api/session/start` | `src/app/api/session/start/route.ts` | Route handler | Tidak | Menyimpan access token antrian ke cookie |
| `POST /api/session/exchange` | belum ada | | | Penukaran one-time code WebView, menunggu BE (ADR-0008) |

Route group `(public)`, `(auth)`, `(embed)` hanya pengelompokan folder, tidak masuk URL. `(embed)` memberi layout tanpa navbar dan footer untuk WebView.

## 2. Aturan tipis untuk `app/`

`app/` hanya melakukan komposisi: ambil `params`, bungkus `Suspense`, render satu Container dari `features`. Tidak ada logika bisnis, tidak ada fetch, tidak ada format teks. Contoh nyata, [`queue/page.tsx`](../../src/app/events/[eventId]/queue/page.tsx):

```tsx
export default function QueuePage({ params }: PageProps<"/events/[eventId]/queue">) {
  return (
    <Suspense fallback={<ScreenLoading />}>
      <Queue params={params} />
    </Suspense>
  );
}

async function Queue({ params }: Pick<PageProps<"/events/[eventId]/queue">, "params">) {
  const { eventId } = await params;
  return <QueueContainer eventId={eventId} />;
}
```

Dua hal yang sering salah dipahami:

- **`params` dibaca di dalam `Suspense`.** Cache Components (`cacheComponents: true` di `next.config.ts`) menuntut akses data runtime berada di dalam batas Suspense. Itulah sebabnya ada komponen kecil `Queue` terpisah dari `QueuePage`.
- **`PageProps<"...">` dan `LayoutProps<"...">`** adalah tipe global Next yang diturunkan dari path route, jadi tidak ada tipe `params` buatan tangan.

## 3. Layout dan provider

- **Root layout** (`app/layout.tsx`) hanya memasang font (Poppins, Telkomsel Batik Sans), `lang="id"`, dan `<body>`. **Tidak ada provider client di sini**, supaya Home tetap statis ([ADR-0007](../adr/0007-rendering-strategy.md)).
- **Layout per route** (`queue`, `book`, `orders/[orderId]/pay`, `m/orders/.../pay`) membungkus anaknya dengan `Suspense` dan `AppProviders` (container DI + TanStack Query). Route yang butuh data klien memasang sendiri providernya.
- **`AppProviders`** ([`src/di/AppProviders.tsx`](../../src/di/AppProviders.tsx)) membuat container Awilix (`createAppContainer`) dan `QueryClient` per mount, lalu memasang `DependencyProvider` dan `QueryClientProvider`. Pada mode mock (`NEXT_PUBLIC_API_MOCKING=enabled`) ia menunda query sampai worker MSW siap.
- **`instrumentation.ts`** menyalakan MSW sisi server (untuk Home) pada mode mock.

## 4. Lapisan dan alur data

```
src/app/**/page.tsx                       komposisi: params + Suspense (+ kebijakan cache)
   │
   ▼
modules/<m>/presentation/<S>Container.tsx "use client": const vm = use<S>ViewModel(); return <View {...vm} />
   │
   ▼
modules/<m>/presentation/use<S>ViewModel.ts
   │   const { useCase, random } = useCradle<<M>Dependencies & CoreDependencies>()
   │   useQuery(<m>Query({ useCase, random }, id))  /  useMutation(() => useCase.execute(...))
   │         │
   │         ▼
   │   presentation/to<S>ViewProps.ts      fungsi murni: data domain → props View (format, i18n)
   ▼
modules/<m>/application/<UseCase>.ts      execute() → port (interface)
   │                                           ▲
   ▼                                           │ implements (dipasang di src/di)
modules/<m>/domain                   modules/<m>/infrastructure/Http<Nama>Repository.ts → HttpClient (zod, AppFailure)
```

Paralel: `src/ui/design-system` (design system props-only di atas Signal DS), `presentation/views` per modul, dan `src/ui/i18n` (`t("key")`, default `id`).

Dari mana use case datang: `AppProviders` membuat container dengan `createAppContainer(readAppConfig())` ([`src/di/container.ts`](../../src/di/container.ts)). Container itu merakit `coreModule(config)` dan registrasi setiap modul (`catalogModule()`, `queueModule()`, ...). ViewModel tidak pernah mengimpor kelas implementasi.

Contoh nyata: Waiting Room.

1. `QueueContainer` memanggil `useQueueViewModel(eventId)` lalu merender `QueueView` dengan hasilnya.
2. ViewModel mengambil `getQueueState`, `watchQueueState`, `startSession`, dan `random` dari container. Snapshot awal lewat `queuePositionQuery` (GET); pembaruan datang dari SSE lewat `useLiveUpdates`, yang menulis ke cache query yang sama dan menutup stream saat `admitted`. Selama stream tidak tersambung, polling cadangan mengikuti `retryAfterMs` dengan `withJitter` ([ADR-0016](../adr/0016-realtime-updates-sse.md)).
3. `GetQueueState.execute` memanggil port `QueueRepository`; implementasinya `HttpQueueRepository` memparse response dengan zod lewat `FetchHttpClient`.
4. Saat status `admitted`, ViewModel menjalankan mutation `startSession.execute(accessToken)` (port `SessionGateway` di `src/core`, adapter di `src/platform`), lalu `router.push("/events/{id}/book")`.
5. Galat dipetakan `toAppError` → `errorKey` → pesan `t(...)`. `QueueView` tidak tahu apa pun tentang HTTP.

**Pengecualian Home**: route `src/app/(public)/page.tsx` adalah Server Component dengan fungsi `"use cache"` yang memanggil `loadHomeViewProps(getServerCradle())`. Loader itu ada di presentation modul `catalog` dan tidak memakai hook; kebijakan cache tetap di route ([ADR-0003](../adr/0003-presentation-pattern-viewmodel-hooks.md), [ADR-0015](../adr/0015-dependency-injection-awilix.md)). Galat backend ditangkap di loader dan dirender sebagai state error, bukan dilempar.

### Penegakan dependensi

[`eslint.boundaries.mjs`](../../eslint.boundaries.mjs) (`eslint-plugin-boundaries`, `default: "disallow"`) menjadikan aturan berikut error lint. `<m>` berarti modul yang sama; impor lintas modul selalu ditolak.

| Dari | Boleh mengimpor |
|---|---|
| `domain` | `domain` `<m>`, `core/domain` |
| `application` | `domain`/`application` `<m>`, `core` |
| `infrastructure` | `domain`/`application`/`infrastructure` `<m>`, `core`, `platform` |
| `presentation` | `domain`/`presentation`/`views` `<m>`, `core/domain`, `ui`; `application` `<m>` dan `core/application` **hanya tipe** |
| `views` | `ui/design-system`, `views` `<m>`; `domain` `<m>` hanya tipe |
| `<m>.module.ts` | semua lapisan `<m>`, `core`, `platform` |
| `src/di` | `*.module.ts`, `core`, `platform`, `ui`, `mocks` |
| `src/app`, `proxy.ts`, `instrumentation.ts` | `di`, presentation dan views modul, `ui`, `platform` |

Aturan tambahan: `domain` dan `application` tanpa framework, `zod`, `awilix`, `fetch`, `Date.now()` (application juga tanpa `Math.random()`); `awilix` hanya di `src/di` dan `*.module.ts`. Kode mock (`@/mocks`) hanya boleh diimpor dari `src/di/AppProviders.tsx`, `src/instrumentation.ts`, dan test.

## 5. Gerbang akses: `proxy.ts`

`src/proxy.ts` menggantikan `middleware.ts` di Next 16. Matcher: `/events/:eventId/book` dan `/orders/:orderId/pay`.

| Kondisi | Hasil |
|---|---|
| Cookie `access_token` ada | Lanjut |
| Tidak ada, path `/events/{id}/book` | Redirect ke `/events/{id}/queue` |
| Tidak ada, path `/orders/{id}/pay` | Redirect ke `/` |

Batasan saat ini, yang sengaja dicatat jujur:

- **Hanya memeriksa keberadaan cookie.** Tanda tangan JWT belum diverifikasi di edge ([ADR-0007](../adr/0007-rendering-strategy.md)). Verifikasi final ada di BE.
- **Tidak bisa mendeteksi sesi dicabut** (`SESSION_REVOKED`). Itu diketahui dari respons API ([ADR-0010](../adr/0010-login-single-session-progress-persistence.md)).
- **Matcher belum mencakup `/m/orders/*/pay`** (WebView) dan `/orders/*/ticket`. Rute embed memang akan memakai exchange code, belum dibangun.
- Gerbang login belum ada: tidak ada redirect ke `/login` saat belum masuk. Lihat [auth](auth-login-register.md).

## 6. Cookie sesi

`POST /api/session/start` menerima `{ "accessToken": string }`, lalu menyetel cookie `access_token`:

| Atribut | Nilai |
|---|---|
| `httpOnly` | `true` (tidak terbaca JS) |
| `sameSite` | `lax` |
| `secure` | `true` di production |
| `path` | `/` |
| `maxAge` | 600 detik |

Token tidak pernah muncul di URL. E2E memverifikasi: URL tidak mengandung `token`, cookie `httpOnly`, dan `document.cookie` tidak berisi `access_token` ([`expiry-and-guards.spec.ts`](../../e2e/expiry-and-guards.spec.ts)). Body kosong atau tanpa token mengembalikan `400 QUEUE_TOKEN_INVALID`. Nama cookie dan umurnya ada di `src/platform/session/accessTokenCookie.ts` (dipakai route handler dan `proxy.ts`). Sisi klien: use case `StartSession` → port `SessionGateway` → `HttpSessionGateway`.

## 7. Cara menambah route baru

Ikuti skill [`new-feature-screen`](../ai/skills/new-feature-screen/SKILL.md). Ringkasnya: tipe di `domain` → port dan use case di `application` → adapter di `infrastructure` → registrasi di `<m>.module.ts` → handler MSW → query options, View, mapper, ViewModel, Container di `presentation` → `page.tsx` tipis (+ layout bila butuh `AppProviders`) → tambah matcher `proxy.ts` bila route dijaga → test mapper, ViewModel, dan E2E.

## 8. Strategi test per lapisan

| Lapisan | Test |
|---|---|
| `domain` | Vitest murni, tanpa browser (kuota, waktu, progres antrian) |
| `application` | Vitest dengan fake port, tanpa MSW |
| `infrastructure` | Vitest, repository HTTP terhadap MSW, di-resolve dari container uji |
| `di` | Setiap registrasi bisa di-resolve dalam mode strict |
| `presentation` | Mapper tanpa render; ViewModel dengan Testing Library + MSW + container uji |
| Route end-to-end | Playwright dengan jam palsu (`e2e/`) |

Coverage 85% untuk `domain`, `application`, `infrastructure`, dan `di`.

Detail di [`testing.md`](../ai/steering/testing.md).
