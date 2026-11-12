# Implementation Plan: Rusuh Tiket Booking — Frontend Alignment v2.1
## Overview
Rencana implementasi ini mencakup tiga area kerja utama:
1. **Alignment** — tiga modul yang sudah ada (`queue`, `booking`, `payment`) disesuaikan ke API contracts v2.1
2. **New build** — modul `auth` dan `ticket` dibangun dari nol
3. **Infrastructure** — route pages, i18n message keys, MSW mock handlers, dan E2E tests
Urutan task mengikuti Clean Architecture: domain → application → data → controllers → views. Task ALIGN = update file yang ada; task NEW = buat file baru.
## Owner Legend
- `@owner:akbar` — Akbar Hartomo: Home/Catalog, Payment, Ticket modules
- `@owner:muzaki` — Ahmad Muzaki: Core Domain, Queue, Booking, Auth modules, HTML Email
## Task Dependency Graph
```
1 (core domain)
├── 2 (queue domain) ──► 3 (queue app/data) ──► 4 (queue controller) ──► 5 (checkpoint)
├── 6 (booking domain) ──► 7 (booking app) ──► 8 (booking data) ──► 9 (booking controller) ──► 10 (checkpoint)
├── 11 (payment domain) ──► 12 (payment app) ──► 13 (payment data) ──► 14 (payment controller) ──► 15 (checkpoint) ──► 16 (payment state machine)
│                                                                                                                           │
│                                                                                                           40 (webview) ◄──┘
│                                                                                                               │
│                                                                                                         41-43 (embed routes, MSW)
├── 17 (auth domain/app) ──► 18 (auth data/controller)
└── 19 (ticket module)
25 (catalog) ── no dependencies, can run parallel
20 (routes) ◄── 4, 9, 14, 18, 19
21 (i18n) ◄── 4, 9, 14, 16, 18, 19, 40
22 (MSW) ◄── 3, 8, 13, 18, 19, 43
23 (full checkpoint) ◄── 16, 18, 20, 21, 22, 40-43
24 (E2E) ◄── 23
26 (email) ── no dependencies
```
```json
{
  "waves": [
    {
      "wave": 1,
      "description": "Foundation — core domain, catalog, and email (no dependencies)",
      "tasks": [1, 25, 26]
    },
    {
      "wave": 2,
      "description": "Domain layers — queue, booking, payment, auth, ticket",
      "tasks": [2, 6, 11, 17, 19]
    },
    {
      "wave": 3,
      "description": "Application layers",
      "tasks": [3, 7, 12, 18]
    },
    {
      "wave": 4,
      "description": "Data layers",
      "tasks": [8, 13]
    },
    {
      "wave": 5,
      "description": "Controllers, views, and module checkpoints",
      "tasks": [4, 9, 14]
    },
    {
      "wave": 6,
      "description": "Module checkpoints",
      "tasks": [5, 10, 15]
    },
    {
      "wave": 7,
      "description": "Payment Page State Machine (Requirement 14)",
      "tasks": [16]
    },
    {
      "wave": 8,
      "description": "Integration — routes, i18n, MSW handlers",
      "tasks": [20, 21, 22]
    },
    {
      "wave": 9,
      "description": "Full application checkpoint",
      "tasks": [23]
    },
    {
      "wave": 10,
      "description": "E2E tests",
      "tasks": [24]
    },
    {
      "wave": 11,
      "description": "WebView Payment Integration (ADR-007)",
      "tasks": [40, 41, 42, 43]
    }
  ]
}
```
## Task Dependency Graph
```
1 (core domain)
├── 2 (queue domain) ──► 3 (queue app/data) ──► 4 (queue controller) ──► 5 (checkpoint)
├── 6 (booking domain) ──► 7 (booking app) ──► 8 (booking data) ──► 9 (booking controller) ──► 10 (checkpoint)
├── 11 (payment domain) ──► 12 (payment app) ──► 13 (payment data) ──► 14 (payment controller) ──► 15 (checkpoint) ──► 16 (payment state machine)
│                                                                                                                           │
│                                                                                                           40 (webview) ◄──┘
│                                                                                                               │
│                                                                                                         41-43 (embed routes, MSW)
├── 17 (auth domain/app) ──► 18 (auth data/controller)
└── 19 (ticket module)
25 (catalog) ── no dependencies, can run parallel
20 (routes) ◄── 4, 9, 14, 18, 19
21 (i18n) ◄── 4, 9, 14, 16, 18, 19, 40
22 (MSW) ◄── 3, 8, 13, 18, 19, 43
23 (full checkpoint) ◄── 16, 18, 20, 21, 22, 40-43
24 (E2E) ◄── 23
26 (email) ── no dependencies
```
## Tasks
- [ ] 1. Extend core domain dengan CAPTCHA dan system-health protocols [NEW] `@owner:muzaki`
  - [ ] 1.1 Buat `src/core/domain/captcha.protocol.ts` dan `captcha.constants.ts` `@owner:muzaki`
    - _Requirements: 3.22, 12.4_
  - [ ] 1.2 Buat `src/core/domain/system-state.model.ts`, `system-health.protocol.ts`, `system-health-updates.protocol.ts` `@owner:muzaki`
    - _Requirements: ~~BR-21, BR-22~~ ❌ DIHAPUS (ADR-006 §4.3) — File tetap dibuat untuk circuit breaker state, tapi tanpa pause admission_
  - [ ] 1.3 Tulis unit tests di `src/core/domain/__tests__/system-state.model.test.ts` `@owner:muzaki`
    - _Requirements: 3.22, ~~BR-21~~ (ADR-006 §4.3)_
- [x] 2. Align queue module — domain layer [ALIGN] `@owner:muzaki`
  - [x] 2.1 Tulis ulang `src/modules/queue/domain/queue-state.model.ts` `@owner:muzaki`
    - _Requirements: 3.1, 3.2, 3.3, 3.3a, 3.13, 3.15, ~~BR-21~~ (ADR-006 §4.3)_
  - [x] 2.2 Tulis ulang `src/modules/queue/domain/queue.protocol.ts` `@owner:muzaki`
    - _Requirements: 3.2, 3.5, 3.13, 3.22_
  - [x] 2.3 Tulis ulang `src/modules/queue/domain/queue-updates.protocol.ts` `@owner:muzaki`
    - _Requirements: 3.2, 3.3, BR-16, BR-20_
  - [x] 2.4 Tulis property tests queue-progress.rules `@owner:muzaki`
- [ ] 3. Align queue module — application dan data layers [ALIGN + NEW] `@owner:muzaki`
  - [ ] 3.1 Buat join-queue-with-captcha.use-case.ts `@owner:muzaki`
  - [x] 3.2 Rename get-queue-state → get-customer-queue-state.use-case.ts `@owner:muzaki`
  - [x] 3.3 Tulis ulang watch-queue-state.use-case.ts `@owner:muzaki`
  - [x] 3.4 Tulis ulang http-queue.service.ts `@owner:muzaki`
  - [x] 3.5 Tulis ulang sse-queue-updates.service.ts `@owner:muzaki`
  - [x] 3.6 Update queue.module.ts `@owner:muzaki`
- [x] 4. Align queue module — controller, views, dan route [ALIGN] `@owner:muzaki`
  - [x] 4.1 Tulis ulang queue.controller.ts `@owner:muzaki`
  - [x] 4.2 Tulis ulang queue.mapper.ts `@owner:muzaki`
  - [x] 4.3 Update queue.queries.ts `@owner:muzaki`
  - [x] 4.4 Update QueueView.tsx dan QueueContainer.tsx `@owner:muzaki`
  - [x] 4.5 Tulis integration tests queue.controller.test.tsx `@owner:muzaki`
- [ ] 5. Checkpoint — queue module `@owner:muzaki`
- [x] 6. Align booking module — domain layer [ALIGN + NEW] `@owner:muzaki`
  - [x] 6.1 Tulis ulang booking-session.model.ts `@owner:muzaki`
  - [x] 6.2 Update booking.protocol.ts `@owner:muzaki`
  - [x] 6.3 Buat attendee.model.ts `@owner:muzaki`
    - _Jadi `booking-request.model.ts`_
  - [x] 6.4 Buat nik-dedup.rules.ts `@owner:muzaki`
    - _Jadi `ticket-holders.rules.ts`_
  - [x] 6.5 Update can-add-ticket.rules.ts `@owner:muzaki`
  - [x] 6.6 Update selection.reducer.ts `@owner:muzaki`
  - [x] 6.7 Update booking.constants.ts `@owner:muzaki`
  - [x] 6.8 Tulis property tests booking domain `@owner:muzaki`
- [x] 7. Align booking module — application layer [ALIGN + NEW] `@owner:muzaki`
  - [x] 7.1 Buat validate-nik.use-case.ts `@owner:muzaki`
  - [x] 7.2 Buat submit-booking.use-case.ts `@owner:muzaki`
  - [x] 7.3 Tulis unit tests submit-booking.use-case.test.ts `@owner:muzaki`
- [x] 8. Align booking module — data layer [ALIGN] `@owner:muzaki`
  - [x] 8.1 Tulis ulang http-booking.service.ts `@owner:muzaki`
  - [x] 8.2 Tulis ulang booking-session.schema.ts `@owner:muzaki`
- [x] 9. Align booking module — controller, views, dan module [ALIGN] `@owner:muzaki`
  - [x] 9.1 Tulis ulang booking.controller.ts `@owner:muzaki`
  - [x] 9.2 Tulis ulang booking.mapper.ts `@owner:muzaki`
  - [x] 9.3 Update booking.queries.ts `@owner:muzaki`
  - [x] 9.4 Tulis ulang BookingView.tsx `@owner:muzaki`
  - [x] 9.5 Update BookingContainer.tsx dan CategoryRow.tsx `@owner:muzaki`
  - [x] 9.6 Update booking.module.ts `@owner:muzaki`
  - [x] 9.7 Update integration tests booking.controller.test.tsx `@owner:muzaki`
- [x] 10. Checkpoint — booking module `@owner:muzaki`
- [x] 11. Align payment module — domain layer [ALIGN] `@owner:akbar`
  - [x] 11.1 Tulis ulang order.model.ts — PaymentMethod, PaymentInstruction, BankCode, OrderStatus `@owner:akbar`
    - _Requirements: 6.1, 6.3, 6.7, 6.11, 6.13, 6.16, BR-05_
  - [x] 11.2 Tulis ulang order.protocol.ts — getAvailableMethods, retryPayment, getPaymentStatus `@owner:akbar`
    - _Requirements: 6.3, 6.11, 6.12, 6.19_
  - [x] 11.3 Hapus order-updates.protocol.ts (SSE removed, polling-only) `@owner:akbar`
  - [x] 11.4 Update order.rules.ts — canRetryPayment, canInitiatePayment, isFinalOrder `@owner:akbar`
    - _Requirements: 6.7, 6.8, 6.19_
  - [x] 11.5 Update payment.constants.ts — PAYMENT_STATUS_POLL_INTERVAL_MS, MIN_RETRY_REMAINING_SECONDS `@owner:akbar`
    - _Requirements: 6.1, 6.7, 6.13, 6.19, BR-05, BR-06_
- [x] 12. Align payment module — application layer [ALIGN + NEW] `@owner:akbar`
  - [x] 12.1 Tulis ulang watch-order.use-case.ts → polling-based `@owner:akbar`
    - _Requirements: 6.12, 6.13_
  - [x] 12.2 Update get-order.use-case.ts — rename orderId → bookingId `@owner:akbar`
  - [x] 12.3 Update start-payment.use-case.ts — add BankCode param `@owner:akbar`
  - [x] 12.4 Buat get-available-methods.use-case.ts [NEW] `@owner:akbar`
  - [x] 12.5 Buat retry-payment.use-case.ts [NEW] `@owner:akbar`
  - [x] 12.6 Update payment.use-cases.test.ts — Property 11 `@owner:akbar`
- [x] 13. Align payment module — data layer [ALIGN] `@owner:akbar`
  - [x] 13.1 ~~Rename sse-order-updates.service.ts → http-payment-status.service.ts~~ (N/A: SSE removed, polling via getPaymentStatus in http-order.service) `@owner:akbar`
  - [x] 13.2 Tulis ulang http-order.service.ts — new endpoints (DONE: all v2.1 endpoints implemented) `@owner:akbar`
  - [x] 13.3 Tulis ulang order.schema.ts — new Zod schemas (DONE: all schemas aligned with v2.1) `@owner:akbar`
- [x] 14. Align payment module — controller, views, dan module [ALIGN] `@owner:akbar`
  - [x] 14.1 Tulis ulang payment.controller.ts — polling, bank selection, retry flow `@owner:akbar`
    - _Requirements: 6.1, 6.2, 6.3, 6.11, 6.12, 6.13, 6.16, 6.19_
  - [x] 14.2 Tulis ulang payment.queries.ts — polling query, mutations `@owner:akbar`
  - [x] 14.3 Tulis ulang payment.mapper.ts — new types mapping `@owner:akbar`
  - [x] 14.4 Tulis ulang PaymentView.tsx — bank selection UI, VA display, GoPay deeplink `@owner:akbar`
  - [x] 14.5 Update payment.module.ts — register new use cases `@owner:akbar`
  - [x] 14.6 Update integration tests payment controllers `@owner:akbar`
- [x] 15. Checkpoint — payment module `@owner:akbar`
- [x] 16. Payment Page State Machine Implementation (Requirement 14) [NEW] `@owner:akbar`
  - [x] 16.1 Buat `src/modules/payment/domain/payment-page-state.model.ts` — 7 state types `@owner:akbar`
    - _Requirements: 14.1-14.7, BR-23_
  - [x] 16.2 Buat `src/modules/payment/domain/clock-sync.rules.ts` — calculateClockOffset, calculateRemaining `@owner:akbar`
    - _Requirements: 14.8-14.11, BR-24_
  - [x] 16.3 Buat `src/modules/payment/controllers/payment-page.controller.ts` — state machine controller `@owner:akbar`
    - _Requirements: 14.1-14.7_
  - [x] 16.4 Buat `src/modules/payment/controllers/payment-polling.hook.ts` — 2s polling dengan retry `@owner:akbar`
    - _Requirements: 14.12-14.14, BR-26_
  - [x] 16.5 Buat `src/modules/payment/domain/payment-error.mapper.ts` — error code to i18n mapping `@owner:akbar`
    - _Requirements: 14.18-14.20_
  - [x] 16.6 Buat `src/modules/payment/controllers/payment-focus.hook.ts` — accessibility focus management `@owner:akbar`
    - _Requirements: 14.28_
  - [x] 16.7 Buat `src/modules/payment/controllers/payment-edge-cases.hook.ts` — double-click guard, exit warning, offline detection `@owner:akbar`
    - _Requirements: 14.21-14.25_
  - [x] 16.8 Update `src/modules/payment/views/PaymentCountdown.tsx` — role="timer", aria-live `@owner:akbar`
    - _Requirements: 14.26-14.27_
  - [x] 16.9 Update `src/modules/payment/views/PaymentButton.tsx` — aria-busy, aria-describedby `@owner:akbar`
    - _Requirements: 14.29_
  - [x] 16.10 Tulis property tests payment state machine `@owner:akbar`
    - _Requirements: BR-23, BR-24, BR-25, BR-26_
  - [x] 16.11 Tulis integration tests payment page state transitions `@owner:akbar`
    - _Requirements: 14.1-14.7_
- [ ] 17. Buat auth module — domain dan application layers [NEW] `@owner:muzaki`
  - _Desain: ADR-0023 (Proposed). Tunggu BE menyepakati usulan perubahan kontrak di ADR-0023, terutama cara token magic link sampai ke verifikasi, sebelum 17.4, 17.7, dan 18.1_
  - [x] 17.1 Buat user.model.ts `@owner:muzaki`
    - _Jadi `account.model.ts` (Account, SavedNik, RegisterInput)_
  - [x] 17.2 Buat auth.protocol.ts `@owner:muzaki`
  - [x] 17.3 Buat nik-validation.rules.ts `@owner:muzaki`
    - _Jadi `account.rules.ts` (`isEmail`, `isNikFormat`)_
  - [x] 17.4 Buat request-magic-link.use-case.ts `@owner:muzaki`
  - [ ] 17.5 Buat validate-nik.use-case.ts (auth) `@owner:muzaki`
    - _Cek dulu apakah cukup memakai validasi NIK booking (`POST /nik/validate`, task 7.1)_
  - [ ] 17.6 Tulis property tests nik-validation.rules `@owner:muzaki`
  - [x] 17.7 Buat resend-magic-link.use-case.ts dan verify-magic-link.use-case.ts `@owner:muzaki`
    - _`verify-login.use-case.ts` lewat route same-origin `/api/auth/verify`_
- [x] 18. Buat auth module — data, controller, views, dan module [NEW] `@owner:muzaki`
  - [x] 18.1 Buat http-auth.service.ts `@owner:muzaki`
  - [x] 18.2 Buat login.controller.ts `@owner:muzaki`
  - [x] 18.3 Buat register.controller.ts `@owner:muzaki`
  - [x] 18.4 Update LoginContainer.tsx `@owner:muzaki`
  - [x] 18.5 Buat RegisterContainer.tsx `@owner:muzaki`
  - [x] 18.6 Buat auth.module.ts `@owner:muzaki`
  - [x] 18.7 Update di/container.ts `@owner:muzaki`
  - [x] 18.8 Tulis integration tests auth `@owner:muzaki`
    - _Test controller login, verify, register, akun, dan gateway `/api` dengan MSW_
- [x] 19. Buat ticket module [NEW] `@owner:akbar`
  - [x] 19.1 Buat ticket.model.ts dan ticket.protocol.ts `@owner:akbar`
    - _Requirements: 7.1, 7.5_
  - [x] 19.2 Buat get-ticket.use-case.ts dan get-my-tickets.use-case.ts `@owner:akbar`
  - [x] 19.3 Buat http-ticket.service.ts `@owner:akbar`
  - [x] 19.4 Buat ticket.controller.ts `@owner:akbar`
  - [x] 19.5 Buat TicketView.tsx `@owner:akbar`
  - [x] 19.6 Update TicketContainer.tsx `@owner:akbar`
  - [x] 19.7 Buat ticket.module.ts `@owner:akbar`
- [ ] 20. Update app route pages [ALIGN + NEW]
  - [x] 20.1 Update queue page.tsx `@owner:muzaki`
  - [x] 20.2 Update login page.tsx `@owner:muzaki`
  - [x] 20.3 Buat register page.tsx `@owner:muzaki`
  - [x] 20.4 Buat verify page.tsx `@owner:muzaki`
    - _`/login/verify#token=...`; ditambah `/account` dan `/tickets`_
    - _Token akun disimpan lewat route same-origin di cookie httpOnly, tidak di URL atau `localStorage` (ADR-0023)_
  - [x] 20.5 Update book page.tsx `@owner:muzaki`
  - [x] 20.6 Update pay page.tsx — rename orderId → bookingId `@owner:akbar`
  - [x] 20.7 Update ticket page.tsx `@owner:akbar`
    - _File exists at `src/app/tickets/[ticketId]/page.tsx`_
- [ ] 21. Update i18n message keys [ALIGN]
  - [x] 21.1 Tambahkan queue message keys `@owner:muzaki`
  - [x] 21.2 Tambahkan auth message keys `@owner:muzaki`
  - [x] 21.3 Tambahkan payment message keys `@owner:akbar`
  - [ ] 21.4 Tulis i18n property tests `@owner:muzaki`
- [x] 22. MSW mock handlers [ALIGN] `@owner:shared`
  - [x] 22.1 Update handlers.ts — all v2.1 endpoints `@owner:shared`
    - _Handler per tag di `src/mocks/api/`, diuji terhadap contoh `src/core/data/http/openapi.json`_
- [ ] 23. Checkpoint — full application `@owner:shared`
- [x] 24. E2E tests [NEW]
  - [x] 24.1 Happy path E2E test `@owner:muzaki`
    - _File: `e2e/happy-path.spec.ts`_
  - [x] 24.2 ~~Queue pause E2E test~~ → Error retry E2E test `@owner:muzaki` _(ADR-006 §4.3: tidak ada pause, test retry behavior)_
    - _File: `e2e/expiry-and-guards.spec.ts`_
  - [x] 24.3 Payment retry E2E test `@owner:akbar`
    - _Test in `e2e/happy-path.spec.ts`_
- [x] 25. Align catalog/home module [ALIGN] `@owner:akbar`
  - [x] 25.1 Review event.model.ts — EventStatus alignment `@owner:akbar`
    - _Requirements: 1.1, 1.2, 1.3_
  - [x] 25.2 Review catalog.protocol.ts `@owner:akbar`
  - [x] 25.3 Update http-catalog.service.ts `@owner:akbar`
  - [x] 25.4 Update catalog.controller.ts — polling 5s, QUEUE_OPEN redirect `@owner:akbar`
    - _Requirements: 1.4, 2.1, 2.2_
  - [x] 25.5 Update CatalogContainer.tsx dan EventCard.tsx `@owner:akbar`
  - [x] 25.6 Update Home page.tsx `@owner:akbar`
- [ ] 26. HTML email templates [NEW] `@owner:muzaki`
  - [x] 26.1 Buat ticket-issued.mjml `@owner:muzaki`
    - _Requirements: 7.2, 7.3_
  - [x] 26.2 Buat booking-expired.mjml `@owner:muzaki`
  - [ ] 26.3 Buat payment-reminder.mjml `@owner:muzaki`
  - [x] 26.4 Update emails/build.mjs `@owner:muzaki`
  - [x] 26.5 Buat login-link.mjml dan verify-register.mjml (ADR-0023) `@owner:muzaki`
## Owner Summary
| Owner | Tasks | Modules |
|-------|-------|---------|
| **Akbar** | 11-16, 19, 20.6-20.7, 21.3, 24.3, 25, 40-42 | Payment, Payment State Machine (Req 14), WebView Integration (ADR-007), Ticket, Catalog/Home |
| **Muzaki** | 1-10, 17-18, 20.1-20.5, 21.1-21.2, 21.4, 24.1-24.2, 26 | Core, Queue, Booking, Auth, Email |
| **Shared** | 22, 23, 42.2, 43 | MSW handlers, WebView error codes, Final checkpoint |
## Notes
- Task ALIGN = update existing; NEW = create from scratch
- Timer/countdown berbasis server-authoritative `expiresAt` + offset (ADR-0005)
- Property tests menggunakan `fast-check`
- i18n tasks (20.1-20.3) harus sequential (write to same file)
---
## API Contract Alignment Tasks (Wave 0 — Pre-implementation)
> **Reference**: `docs/api/api-contract.md` dan `design.md Appendix A`
Task-task ini HARUS diselesaikan sebelum implementasi modul terkait untuk memastikan compatibility dengan API contract.
- [x] 27. Core HTTP client — API contract alignment [ALIGN] `@owner:shared`
  - [x] 27.1 Update `http-client.ts` dengan auth headers support (X-Grant-Token, X-Device-Id, X-Queue-Token)
    - _Requirements: API contract Authentication section_
  - [x] 27.2 Buat `api-response.schema.ts` untuk wrap/unwrap `{meta, data}` pattern
    - _Envelope dibuka di `fetch-http.client.ts`; tidak ada file schema terpisah_
  - [x] 27.3 Tambah snake_case → camelCase transformer di response parsing
    - _Per schema zod modul (`.transform()`), bukan transformer generik_
  - [x] 27.4 Update error handling untuk parse `meta.code` dan `meta.message`
    - _Service memetakan status HTTP per endpoint lewat `RequestOptions.errorCodes`_
- [ ] 28. Queue module types alignment [ALIGN] `@owner:muzaki`
  - [ ] 28.1 Update `QueueJoinResult` — tambah `event: { id, name }`
  - [ ] 28.2 Update `CustomerQueueState` — ganti `accessToken` → `grantToken`
  - [ ] 28.3 Update `queue.protocol.ts` — methods menerima `grantToken` parameter
  - [ ] 28.4 Update `queue.schema.ts` — snake_case mapping untuk API response
- [ ] 29. Booking module types alignment [ALIGN] `@owner:muzaki`
  - [ ] 29.1 Update `NikValidationResult` — tambah `name`, `status` fields
  - [ ] 29.2 Update `BookingResult` — tambah `event`, `tickets[]` dengan `holderName`, `summary`
  - [ ] 29.3 Update `BookingProtocol` — methods menerima `grantToken`, `deviceId?` parameters
  - [ ] 29.4 Update `booking.schema.ts` — snake_case mapping untuk API response
- [x] 30. Payment module types alignment [ALIGN] `@owner:akbar`
  - [x] 30.1 Buat `RetryPaymentResult` type untuk `POST /payments/{id}/retry`
  - [x] 30.2 Update `OrderProtocol` — methods menerima `grantToken`, `deviceId?` parameters
    - _N/A: Protocol adalah kontrak bisnis, bukan HTTP details. Credentials diambil dari `CredentialStoreProtocol` via `grantHeaders()` di service layer. Separation of concerns sudah benar._
  - [x] 30.3 Update `order.schema.ts` — snake_case mapping untuk `instructions.va_number`, dll
    - _Already complete: semua snake_case fields sudah di-transform ke camelCase_
  - [x] 30.4 Update path: `orderId` → `bookingId` di semua payment endpoints
    - _Already complete: semua API paths menggunakan `/bookings/{id}` dan `/payments/{id}` (bookingId)_
- [x] 31. Ticket module types — new [NEW] `@owner:akbar`
  - [x] 31.1 Buat `Ticket` type dengan fields dari `GET /users/me/tickets`
    - _File: `src/modules/ticket/domain/ticket.model.ts` (TicketSummary)_
  - [x] 31.2 Buat `ETicket` type dengan `qrCode`, `qrValue`, `instructions`
    - _File: `src/modules/ticket/domain/ticket.model.ts`_
  - [x] 31.3 Buat `TicketProtocol` dengan `getMyTickets`, `getETicket`
    - _File: `src/modules/ticket/domain/ticket.protocol.ts`_
  - [x] 31.4 Buat `ticket.schema.ts` untuk response parsing
    - _File: `src/modules/ticket/data/ticket.schema.ts`_
- [ ] 32. Auth module saved-niks alignment [ALIGN] `@owner:muzaki`
  - [x] 32.1 Rename `NikFriend` → `SavedNik` sesuai API contract
  - [x] 32.2 Update endpoint paths: `/me/nik-friends/*` → `/accounts/me/saved-niks`
  - [ ] 32.3 Update `SavedNik` type — tambah `status: 'VERIFIED'`
## Updated Dependency Graph
```
27 (http client alignment) ──► 28, 29, 30, 31, 32 (all module alignments)
                                    │
                                    ▼
                              1-26 (existing tasks)
```
## Wave 0 Summary
| Task | Owner | Dependencies | Description |
|------|-------|--------------|-------------|
| 27 | shared | none | HTTP client API contract support |
| 28 | muzaki | 27 | Queue types alignment |
| 29 | muzaki | 27 | Booking types alignment |
| 30 | akbar | 27 | Payment types alignment |
| 31 | akbar | 27 | Ticket module types (new) |
| 32 | muzaki | 27 | Auth saved-niks alignment |
**Catatan**: Wave 0 tasks harus complete sebelum memulai Wave 1 (Task 1). Ini memastikan semua type definitions sudah selaras dengan API contract sebelum implementasi dimulai.
---
## Additional Features (Implemented but not in original tasks)
> Task-task berikut adalah fitur yang sudah diimplementasi tapi tidak tercantum di task list awal.
- [x] 33. Profile/Account Module [NEW] `@owner:muzaki`
  - [x] 33.1 Buat `account.model.ts` (Account, SavedNik types)
  - [x] 33.2 Buat `account.protocol.ts` dan `saved-nik.protocol.ts`
  - [x] 33.3 Buat `get-account.use-case.ts`
  - [x] 33.4 Buat `http-profile.service.ts` dan `http-saved-nik.service.ts`
  - [x] 33.5 Buat `account.controller.ts`
  - [x] 33.6 Buat `AccountView.tsx` dan `AccountContainer.tsx`
  - [x] 33.7 Buat `/app/account/page.tsx`
- [x] 34. Tiket Saya (My Tickets) Module [NEW] `@owner:muzaki`
  - [x] 34.1 Buat `my-tickets.controller.ts`
  - [x] 34.2 Buat `MyTicketsView.tsx` dan `MyTicketsContainer.tsx`
  - [x] 34.3 Buat `/app/tickets/page.tsx`
- [x] 35. E-Ticket Detail Module [NEW] `@owner:muzaki`
  - [x] 35.1 Buat `e-ticket.controller.ts`
  - [x] 35.2 Buat `ETicketView.tsx` dan `ETicketContainer.tsx`
  - [x] 35.3 Buat `/app/tickets/[id]/page.tsx`
- [x] 36. Bantuan (Help) Page [NEW] `@owner:muzaki`
  - [x] 36.1 Buat `help.controller.ts`
  - [x] 36.2 Buat `HelpView.tsx` dan `HelpContainer.tsx`
  - [x] 36.3 Buat `/app/help/page.tsx`
- [x] 37. API Routes (BFF Layer) [NEW] `@owner:muzaki`
  - [x] 37.1 Buat `/api/auth/verify/route.ts`
  - [x] 37.2 Buat `/api/auth/session/route.ts`
  - [x] 37.3 Buat `/api/auth/logout/route.ts`
  - [x] 37.4 Buat `/api/account/[...path]/route.ts`
- [x] 38. Core Hooks & Utilities [NEW] `@owner:muzaki`
  - [x] 38.1 Buat `useAuth` hook
  - [x] 38.2 Buat `useAccount` hook
  - [x] 38.3 Buat credential store utilities
- [x] 39. Shared UI Components [NEW] `@owner:shared`
  - [x] 39.1 Buat reusable ticket card components
  - [x] 39.2 Buat account-related UI components

---

## WebView Payment Integration (ADR-007)

> **Reference**: `design.md` WebView Payment Integration section, ADR-007, Requirements 14.30-14.38, BR-27 s/d BR-32

Task untuk implementasi serah-terima pembayaran dari aplikasi mobile ke WebView. Memungkinkan satu Payment Page digunakan untuk web desktop maupun WebView mobile.

- [x] 40. WebView Payment Integration [NEW] `@owner:akbar`
  - [x] 40.1 Buat `src/modules/payment/domain/webview-handoff.model.ts` `@owner:akbar`
    - HandoffCode, PaymentSession, HandoffResult, ExchangeResult types
    - WebViewMessage union type (PAYMENT_DONE, PAYMENT_EXPIRED, HANDOFF_EXPIRED, OPEN_EXTERNAL, CLOSE)
    - WebViewContext type
    - _Requirements: 14.30, 14.33, BR-27_
  - [x] 40.2 Buat `src/modules/payment/domain/webview-handoff.protocol.ts` `@owner:akbar`
    - WebViewHandoffProtocol interface (requestHandoff, exchangeHandoffCode)
    - _Requirements: 14.31, 14.32, BR-28_
  - [x] 40.3 Buat `src/modules/payment/domain/webview-handoff.rules.ts` `@owner:akbar`
    - HANDOFF_CODE_REGEX, PAYMENT_SESSION_REGEX constants
    - isValidHandoffCode, isValidPaymentSession functions
    - extractHandoffCodeFromFragment, removeCodeFromUrl functions
    - isReactNativeWebView, postMessageToApp functions
    - _Requirements: 14.32, BR-27, BR-29, BR-30, BR-31_
  - [x] 40.4 Buat `src/modules/payment/application/handle-webview-handoff.use-case.ts` `@owner:akbar`
    - HandleWebViewHandoffUseCase type dan factory
    - WebViewHandoffResult type
    - _Requirements: 14.32, 14.35_
  - [x] 40.5 Buat `src/modules/payment/data/webview-handoff.service.ts` `@owner:akbar`
    - createWebViewHandoffService factory
    - POST /payments/{id}/handoff endpoint
    - POST /payments/handoff/exchange endpoint
    - _Requirements: 14.31, 14.32_
  - [x] 40.6 Buat `src/modules/payment/data/webview-bridge.service.ts` `@owner:akbar`
    - WebViewBridgeService interface
    - createWebViewBridgeService factory
    - notifyPaymentDone, notifyPaymentExpired, notifyHandoffExpired, requestOpenExternal, notifyClose
    - _Requirements: 14.33, BR-32_
  - [x] 40.7 Update `src/modules/payment/controllers/payment-page.controller.ts` dengan WebView context `@owner:akbar`
    - webViewContext state
    - handleWebViewHandoff function
    - handlePaymentSessionInvalid function
    - handleGoPayDeeplink function untuk WebView
    - useEffect untuk notify app on payment status changes
    - _Requirements: 14.32, 14.33, 14.34, 14.35, 14.37, 14.38_
  - [x] 40.8 Update `src/modules/payment/views/renderers/GoPayInstructionView.tsx` untuk WebView `@owner:akbar`
    - Panggil requestOpenExternal jika isEmbedded=true
    - _Requirements: 14.34_
  - [x] 40.9 Update `src/modules/payment/payment.module.ts` dengan WebView dependencies `@owner:akbar`
    - Register webViewHandoffService dan webViewBridgeService di DI container
    - Register handleWebViewHandoffUseCase
  - [x] 40.10 Tulis property tests untuk webview-handoff.rules.ts `@owner:akbar`
    - **Property 24: Handoff Code Format Validation** — isValidHandoffCode accepts hc_{64 hex} only
    - **Property 25: Payment Session Memory-Only Storage** — verifikasi tidak pakai localStorage
    - **Property 26: WebView Context Detection** — isReactNativeWebView checks window.ReactNativeWebView
    - **Property 27: Single Credential Per Request** — X-Payment-Session XOR X-Grant-Token
    - _Requirements: BR-27, BR-29, BR-30_
  - [x] 40.11 Tulis integration tests payment WebView flow `@owner:akbar`
    - Test handoff exchange sukses
    - Test handoff code expired
    - Test page reload → HANDOFF_EXPIRED message
    - Test postMessage communication
    - **Property 28: WebView Message Reliability** — app always confirms via GET /bookings
    - _Requirements: 14.32, 14.33, 14.35, BR-32_

- [x] 41. Buat embedded payment route [NEW] `@owner:akbar`
  - [x] 41.1 Buat `src/app/(embed)/m/orders/[bookingId]/pay/page.tsx` `@owner:akbar`
    - Route untuk WebView dengan `isEmbedded=true` dari layout
    - _Requirements: 14.30, 14.38_
  - [x] 41.2 Buat `src/app/(embed)/layout.tsx` `@owner:akbar`
    - Set isEmbedded context untuk semua embedded routes
    - TIDAK pakai navigator.userAgent untuk deteksi
    - _Requirements: 14.38_

- [ ] 42. Update payment error handling untuk WebView errors [ALIGN] `@owner:akbar`
  - [x] 42.1 Update `src/modules/payment/domain/payment-error.mapper.ts` dengan WebView error codes `@owner:akbar`
    - HANDOFF_CODE_INVALID → "Kode Akses Tidak Valid..."
    - PAYMENT_SESSION_INVALID → "Sesi Pembayaran Berakhir..."
    - GRANT_TOKEN_INVALID → "Sesi Booking Berakhir..."
    - VALIDATION_ERROR → "Permintaan Tidak Valid..."
    - _Requirements: 14.18_
  - [ ] 42.2 Update `src/core/domain/app-error.ts` dengan WebView error codes `@owner:shared`
    - Tambah HANDOFF_CODE_INVALID, PAYMENT_SESSION_INVALID, GRANT_TOKEN_INVALID, VALIDATION_ERROR ke ApiErrorCode
    - _Requirements: 14.18_

- [ ] 43. MSW handlers untuk WebView endpoints [NEW] `@owner:shared`
  - [ ] 43.1 Buat handlers untuk `POST /payments/{id}/handoff` `@owner:shared`
  - [ ] 43.2 Buat handlers untuk `POST /payments/handoff/exchange` `@owner:shared`
  - [ ] 43.3 Update existing payment handlers untuk accept X-Payment-Session `@owner:shared`

---

## Final Summary

### Per Owner Statistics
| Owner | Done | Remaining | Total | Progress |
|-------|------|-----------|-------|----------|
| **Muzaki** | 72 | 11 | 83 | 87% |
| **Akbar** | 34 | 27 | 61 | 56% |
| **Shared** | 4 | 4 | 8 | 50% |
| **TOTAL** | **110** | **42** | **152** | **72%** |

### Remaining Tasks by Owner

**Muzaki (11 remaining):**
- Task 1 (Core Domain): 1.1, 1.2, 1.3
- Task 3 (Queue App): 3.1
- Task 5 (Queue Checkpoint)
- Task 17 (Auth): 17.5, 17.6
- Task 21 (i18n): 21.4
- Task 26 (Email): 26.3
- Task 28 (Queue Alignment): 28.1-28.4
- Task 29 (Booking Alignment): 29.2-29.4
- Task 32 (Auth Alignment): 32.3

**Akbar (27 remaining — includes NEW WebView Payment Integration):**
- Task 16 (Payment State Machine - Requirement 14): 16.1-16.11 _(if not done)_
- Task 40 (WebView Payment Integration - ADR-007): 40.1-40.11
- Task 41 (Embedded Payment Route): 41.1-41.2
- Task 42 (WebView Error Handling): 42.1

**Shared (4 remaining):**
- Task 23 (Full Application Checkpoint)
- Task 42 (WebView Error Codes): 42.2
- Task 43 (MSW WebView Handlers): 43.1-43.3

