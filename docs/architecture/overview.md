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
| **Fungsional** | Setiap state alur (expired, stok berubah, pending, sesi diambil alih) dimodelkan eksplisit di state machine `core` dan punya layar sendiri. |
| **Andal** | Logika kritis (kuota, timer, transisi state) adalah fungsi murni yang dites tanpa browser. Home statis dari CDN tetap hidup saat flash crowd. Timer server-authoritative. |

## 2. Lapisan dan aturan dependensi

```
apps/web            Next.js: routing, layout, proxy, komposisi
   │
   ▼
apps/web/features   ViewModel (custom hook) + Container per layar
   │        │          │
   ▼        ▼          ▼
packages/ui  packages/api  packages/i18n
             │
             ▼
       packages/core   domain murni, tanpa React/Next/fetch
```

| Aturan | Ditegakkan oleh |
|---|---|
| `core` tidak mengimpor React, Next, `fetch`, atau package lain di monorepo | ESLint boundaries |
| `ui` hanya menerima props. Tidak fetch, tidak mengimpor `api` atau `features` | ESLint boundaries |
| `api` satu-satunya yang melakukan HTTP. Semua response diparse dengan schema zod | ESLint boundaries + code review |
| Route di `app/` hanya merender Container dari `features` | Code review, steering AI |
| FE tidak pernah memanggil Midtrans langsung | Steering AI, code review |

Detail keputusan ada di [ADR-0002](../adr/0002-layered-clean-architecture.md) dan [ADR-0003](../adr/0003-presentation-pattern-viewmodel-hooks.md).

## 3. Struktur repo

```
rusuh-fe/
├─ AGENTS.md                         pointer ke steering AI
├─ apps/
│  └─ web/
│     ├─ app/
│     │  ├─ (public)/page.tsx                         Home (ISR)
│     │  ├─ (auth)/login/page.tsx
│     │  ├─ events/[eventId]/queue/page.tsx           Waiting Room
│     │  ├─ events/[eventId]/book/page.tsx            Detail Ticket
│     │  ├─ orders/[orderId]/pay/page.tsx             Payment (web)
│     │  ├─ (embed)/m/orders/[orderId]/pay/page.tsx   Payment (WebView)
│     │  ├─ orders/[orderId]/ticket/page.tsx          E-tiket
│     │  ├─ api/session/start/route.ts                Web: access token antrian → cookie
│     │  └─ api/session/exchange/route.ts             WebView: one-time code → cookie (belum dibuat)
│     ├─ proxy.ts                                     Gate access token (middleware.ts di Next < 16)
│     ├─ instrumentation.ts                           MSW sisi server (mode mock)
│     └─ features/
│        ├─ catalog/   queue/   booking/   payment/   auth/
│        └─ <feature>/
│           ├─ use<Screen>ViewModel.ts
│           ├─ <Screen>Container.tsx
│           └─ __tests__/
├─ packages/
│  ├─ core/        domain/, booking/, queue/, payment/, time/, errors/
│  ├─ api/         generated/ (OpenAPI), adapters/, http/
│  ├─ ui/          komponen di atas Signal DS, Storybook
│  ├─ i18n/        pesan per key, default id-ID
│  └─ config/      tsconfig, eslint, tailwind preset
├─ mocks/          package @rusuh/mocks: MSW handlers + skenario (node dan browser)
└─ docs/
```

## 4. Peta halaman ke requirement

| Halaman | Route | Rendering | Requirement |
|---|---|---|---|
| Home | `/` | Static/ISR, revalidate pendek | FR-01–05 |
| Waiting Room | `/events/[eventId]/queue` | Client, polling + jitter | FR-06–10, NFR-05, NFR-06 |
| Detail Ticket | `/events/[eventId]/book` | Dinamis, dijaga proxy | FR-11–19, BR-01–04, BR-07 |
| Payment | `/orders/[orderId]/pay` dan `/m/...` | Dinamis, dijaga proxy | FR-20–25, BR-05–06 |
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

- Diimplementasikan sebagai reducer murni di `packages/core/booking/machine.ts`.
- Saat timer klien menyentuh nol, FE **tidak** memindahkan state sendiri. FE meminta status ke BE, lalu transisi mengikuti jawaban server ([ADR-0005](../adr/0005-server-authoritative-time.md)).

## 6. Kontrak dengan tim lain

| Dengan | Kontrak | Status |
|---|---|---|
| BE | OpenAPI spec di hari pertama, katalog error code, endpoint server time | Menunggu BE |
| BE | Satu sesi login aktif per akun (`sid`), error `SESSION_REVOKED`, progres terikat akun | Draft di [ADR-0010](../adr/0010-login-single-session-progress-persistence.md) |
| BE | `GET /me` (NIK tersamar), NIK unik per akun, `quota` pada sesi booking, batas 3 ditegakkan saat submit | Draft di [ADR-0011](../adr/0011-nik-linked-to-account.md) |
| Mobile | Exchange one-time code → session, `PaymentResultNotifier` (postMessage / custom scheme), deeplink e-wallet | Draft di [ADR-0008](../adr/0008-webview-payment-embed.md) |

## 7. Pertanyaan terbuka

- Tooling (pnpm, Turborepo, TanStack Query, zod, MSW, Playwright) perlu dicek terhadap tech radar.
- Apakah Signal DS menyediakan Tailwind preset, atau kita buat dari token.
- Login: dibuat tim kita atau ada SSO yang tersedia.

## 8. Status implementasi (2026-10-19)

| Ada | Belum ada |
|---|---|
| Workspace pnpm, aturan ESLint boundaries (ADR-0002), Vitest + Testing Library + MSW, workflow CI (belum pernah jalan) | Turborepo (menunggu tech radar), Storybook |
| `core`: `AppError`, `remainingMs`, `withJitter`, `formatMmSs`, `canAddTicket`, `selectionReducer`, tipe event, queue, dan booking | `core`: state machine booking, validasi NIK, `PaymentResultNotifier` |
| `api`: client HTTP + zod, adapter events, queue, booking session, dan payment, query options antrian, booking, dan order | Tipe generated dari OpenAPI (kontrak ditulis tangan), hook mutation booking dan payment |
| `ui`: primitif Signal DS (`Button`, `Badge`, `Card`, `Alert`, `Progress`, `RadioGroup`), `ScreenFrame`, dan view Home, Queue, Booking, Payment (ADR-0012) | Storybook, mode gelap |
| Layar: Home (ISR), Waiting Room, Detail Ticket (dummy, wireframe 9.3), dan Payment mock (9.4, QR contoh, status akhir 9.5) dengan MSW | Login, E-tiket (placeholder), `/maintenance`, integrasi Midtrans via BE |
| `proxy.ts` (cek cookie) dan `/api/session/start` | Verifikasi JWT di edge, `/api/session/exchange` (WebView), offset jam server, countdown |

Catatan: `/api/session/start` (web, body `{ accessToken }`) dan `/api/session/exchange` (WebView, one-time code, ADR-0008) sengaja dipisah karena kontraknya berbeda.
- Jawaban untuk pertanyaan Tailwind preset Signal: tidak ada paket resmi yang ditemukan. Token dan primitif diporting dari repo referensi tim ([ADR-0012](../adr/0012-signal-ds-tokens-and-primitives.md)).
