# Arsitektur Frontend

Status: **Draft untuk paparan tim, 19 Oktober 2026**

## 1. Konteks

Frontend web Rusuh Booking Tiket, dibangun oleh 2 FE Web dalam tim 5 orang (2 BE, 1 Mobile, 2 FE Web).

- **Stack**: Next.js (App Router), Telkomsel Signal Design System, Tailwind CSS.
- **Payment gateway**: Midtrans sandbox, dipanggil hanya oleh BE.
- **Login wajib** sebelum masuk antrian.
- **Payment page dipakai ulang di mobile** lewat WebView.

Tiga kriteria yang dijual ke penilai, dan bagaimana arsitektur ini menjawabnya:

| Kriteria | Jawaban arsitektur |
|---|---|
| **Murah** | Tidak membangun framework internal. Memakai mekanisme React dan library yang sudah matang. Satu payment page untuk web dan mobile. |
| **Fungsional** | Setiap state alur (expired, stok berubah, pending, sesi diambil alih) dimodelkan eksplisit di state machine `domain` modul booking dan punya layar sendiri. |
| **Andal** | Logika kritis (kuota, timer, transisi state) adalah fungsi murni yang dites tanpa browser. Home statis dari CDN tetap hidup saat flash crowd. Timer server-authoritative. |

## 2. Lapisan dan aturan dependensi

Satu aplikasi Next.js yang disusun per **modul fitur** (bounded context). Setiap modul punya lima lapisan yang sama; yang dipakai lebih dari satu modul ada di lapisan yang sama di `src/core` ([ADR-0013](../adr/0013-single-app-modular-structure.md), [ADR-0014](../adr/0014-modular-clean-architecture-solid.md)).

```
src/app  (Next.js: route, layout, proxy)                       framework
   │  merender Container, memberi dependensi server
   ▼
src/di   (composition root: container Awilix, config)          wiring
   │  merakit <m>.module.ts
   ▼
src/modules/<m>/
   views ──► controllers ── import type ──► application ──► domain
   (Container,  (controller, mapper,         (use case)      (model, rules,
    View)        query options)                 ▲             constants, protocol)
                                                │
   data ─ implements protocol ──────────────────┘
   (service + schema zod)

src/core/   domain/ application/ data/ controllers/ views/ i18n/   ◄── lapisan sama, dipakai lintas modul
```

| Aturan | Ditegakkan oleh |
|---|---|
| Dependensi hanya ke dalam: views → controllers → application (tipe) → domain; data → application → domain | ESLint boundaries (`default: "disallow"`) |
| Modul tidak saling mengimpor; yang dipakai bersama pindah ke lapisan yang sama di `src/core` | ESLint boundaries (captured `module`) |
| `domain` dan `application` tanpa React, Next, `zod`, `awilix`, `fetch`, `Date.now()` | ESLint `no-restricted-*` |
| Controller mendapat use case dari container (`useDependencies`), bukan mengimpor implementasi | ESLint boundaries (`dependency.kind: type`), [ADR-0015](../adr/0015-dependency-injection-awilix.md) |
| `awilix` hanya di `src/di` dan `<m>.module.ts` | ESLint `no-restricted-imports` |
| View props-only, hanya design system; hanya `<Layar>Container` yang memanggil controller | ESLint boundaries |
| Angka bisnis di `*.constants.ts`, schema `satisfies z.ZodType<Model>` | Code review, steering AI |
| Route di `app/` hanya merender Container dan kebijakan rendering | Code review, steering AI |
| FE tidak pernah memanggil Midtrans langsung | Steering AI, code review |

Detail: [ADR-0014](../adr/0014-modular-clean-architecture-solid.md) (lapisan, SOLID), [ADR-0015](../adr/0015-dependency-injection-awilix.md) (DI), [ADR-0003](../adr/0003-presentation-pattern-viewmodel-hooks.md) (controller sebagai hook).

Dokumen turunan: [routing dan implementasi lapisan di Next.js](routing-and-layers.md), [login dan register](auth-login-register.md).

## 3. Struktur repo

```
rusuh-fe/
├─ AGENTS.md                          pointer ke steering AI
├─ eslint.boundaries.mjs              aturan lapisan dan modul
├─ e2e/                               Playwright
├─ public/                            aset statis, mockServiceWorker.js
└─ src/
   ├─ app/
   │  ├─ (public)/page.tsx                         Home (ISR, getServerDependencies)
   │  ├─ (auth)/login/page.tsx
   │  ├─ events/[eventId]/queue/page.tsx           Waiting Room
   │  ├─ events/[eventId]/book/page.tsx            Detail Ticket
   │  ├─ orders/[orderId]/pay/page.tsx             Payment (web)
   │  ├─ (embed)/m/orders/[orderId]/pay/page.tsx   Payment (WebView)
   │  ├─ orders/[orderId]/ticket/page.tsx          E-tiket
   │  └─ api/session/start/route.ts                Web: access token antrian → cookie
   ├─ proxy.ts                        gerbang access token (Next 16)
   ├─ instrumentation.ts              MSW sisi server (mode mock)
   ├─ di/                             container.ts, core.module.ts, app-config.reader.ts, server-dependencies.ts, AppProviders.tsx
   ├─ modules/
   │  ├─ catalog/   queue/   booking/   payment/   auth/   ticket/
   │  └─ <m>/
   │     ├─ domain/                   *.model.ts, *.rules.ts, <m>.constants.ts, *.protocol.ts (+ test)
   │     ├─ application/              *.use-case.ts, <m>.dependencies.ts (+ test)
   │     ├─ data/                     http-*.service.ts, sse-*.service.ts, *.schema.ts
   │     ├─ controllers/              <m>.controller.ts, <m>.mapper.ts, <m>.queries.ts (+ test)
   │     ├─ views/                    <Layar>Container.tsx, <Layar>View.tsx props-only
   │     └─ <m>.module.ts             registrasi Awilix
   ├─ core/                          kode bersama, lapisan sama dengan modul
   │  ├─ domain/                      app-error.ts, app-config.model.ts, clock/random/session/live-updates .protocol.ts, time/
   │  ├─ application/                 start-session.use-case.ts, core.dependencies.ts
   │  ├─ data/                        http/ (HttpClient, FetchHttpClient), sse/, session/, system-clock.service.ts, math-random.service.ts
   │  ├─ controllers/                 countdown.hook.ts, live-updates.hook.ts, dependencies.context.tsx (useDependencies), format.utils.ts
   │  ├─ views/                       design-system/ (primitives/, layout/, signal.css), ScreenLoading.tsx
   │  └─ i18n/                        id.messages.ts, t.utils.ts
   ├─ mocks/                          MSW handlers + skenario (node dan browser)
   └─ test/                           support: setupMockServer, setupTestContainer, createWrapper
```

## 4. Peta halaman ke requirement

| Halaman | Route | Rendering | Requirement |
|---|---|---|---|
| Home | `/` | Static/ISR, revalidate pendek | FR-01–05 |
| Waiting Room | `/events/[eventId]/queue` | Client, SSE (polling cadangan + jitter) | FR-06–10, NFR-05, NFR-06 |
| Detail Ticket | `/events/[eventId]/book` | Dinamis, dijaga proxy | FR-11–19, BR-01–04, BR-07 |
| Payment | `/orders/[orderId]/pay` dan `/m/...` | Dinamis, dijaga proxy, status lewat SSE | FR-20–25, BR-05–06 |
| E-tiket | `/orders/[orderId]/ticket` | Dinamis | FR-22 |

## 5. State machine booking (FE)

```
          ┌────────────── stockChanged ◄──┐
          ▼                               │
idle → selecting ──submit──► submitting ──┤
          │                               ├──► held/paying ──► pending ──► paid
          │                               │         │             │
          └── bookingExpired              └─ error  └── paymentExpired ◄┘
```

- Direncanakan sebagai reducer murni di `src/modules/booking/domain/machine.ts` (saat ini baru `selectionReducer`).
- Saat timer klien menyentuh nol, FE **tidak** memindahkan state sendiri. FE meminta status ke BE, lalu transisi mengikuti jawaban server ([ADR-0005](../adr/0005-server-authoritative-time.md)).

## 6. Kontrak dengan tim lain

| Dengan | Kontrak | Status |
|---|---|---|
| BE | OpenAPI spec di hari pertama, katalog error code, endpoint server time | Menunggu BE |
| BE | Stream SSE `/events/{id}/queue/stream` (event `queue`) dan `/orders/{id}/stream` (event `order`): snapshot saat tersambung, heartbeat, tutup di status akhir, CORS dengan credentials | Usulan FE di [ADR-0016](../adr/0016-realtime-updates-sse.md) |
| BE | Satu sesi login aktif per akun (`sid`), error `SESSION_REVOKED`, progres terikat akun | Draft di [ADR-0010](../adr/0010-login-single-session-progress-persistence.md) |
| BE | `GET /me` (NIK tersamar), NIK unik per akun, `quota` pada sesi booking, batas 3 ditegakkan saat submit | Draft di [ADR-0011](../adr/0011-nik-linked-to-account.md) |
| Mobile | Exchange one-time code → session, `PaymentResultNotifier` (postMessage / custom scheme), deeplink e-wallet | Draft di [ADR-0008](../adr/0008-webview-payment-embed.md) |

## 7. Pertanyaan terbuka

- Tooling (npm, Awilix, TanStack Query, zod, MSW, Playwright) perlu dicek terhadap tech radar. Turborepo tidak lagi dibutuhkan (ADR-0013).
- Apakah Signal DS menyediakan Tailwind preset, atau kita buat dari token.
- Login: dibuat tim kita (passwordless, usulan [ADR-0022](../adr/0022-passwordless-login-email.md)) atau ada SSO yang tersedia.

## 8. Status implementasi (2026-10-19, diperbarui 2026-10-29)

| Ada | Belum ada |
|---|---|
| Satu aplikasi dengan modul `catalog`, `queue`, `booking`, `payment` (+ placeholder `auth`, `ticket`), container Awilix, ESLint boundaries per lapisan dan modul (ADR-0013–0015), Vitest + Testing Library + MSW, workflow CI (belum pernah jalan) | Storybook |
| Use case dan protocol per modul, `ClockProtocol`/`RandomProtocol`/`AppConfig` diinjeksikan, test use case dengan fake dan test container | Orkestrasi use case yang lebih kaya (submit booking) |
| `domain`: `AppError`, `remainingMs`, `withJitter`, `formatMmSs` (`core`), `canAddTicket`, `selectionReducer`, tipe event, queue, booking, order (modul) | `domain`: state machine booking, validasi NIK, `PaymentResultNotifier` |
| `data`: `FetchHttpClient` + zod, service HTTP events, queue, booking session, order, simulator pembayaran, schema `satisfies z.ZodType<Model>`; query options di `controllers/` tiap modul; konstanta bisnis per modul | Tipe generated dari OpenAPI (kontrak ditulis tangan), use case submit booking |
| Design system (`src/core/views/design-system`): primitif Signal DS (`Button`, `Badge`, `Card`, `Alert`, `Progress`, `RadioGroup`), `ScreenFrame`, dan view Home, Queue, Booking, Payment (ADR-0012) | Storybook, mode gelap |
| Layar: Home (ISR), Waiting Room, Detail Ticket (dummy, wireframe 9.3), dan Payment mock (9.4, QR contoh, status akhir 9.5) dengan MSW | Login, E-tiket (placeholder), `/maintenance`, integrasi Midtrans via BE |
| `proxy.ts` (cek cookie) dan `/api/session/start` | Verifikasi JWT di edge, `/api/session/exchange` (WebView), offset jam server, countdown |

Catatan: `/api/session/start` (web, body `{ accessToken }`) dan `/api/session/exchange` (WebView, one-time code, ADR-0008) sengaja dipisah karena kontraknya berbeda.
- Jawaban untuk pertanyaan Tailwind preset Signal: tidak ada paket resmi yang ditemukan. Token dan primitif diporting dari repo referensi tim ([ADR-0012](../adr/0012-signal-ds-tokens-and-primitives.md)).
