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
├── 11 (payment domain) ──► 12 (payment app) ──► 13 (payment data) ──► 14 (payment controller) ──► 15 (checkpoint)
├── 16 (auth domain/app) ──► 17 (auth data/controller)
└── 18 (ticket module)

24 (catalog) ── no dependencies, can run parallel

19 (routes) ◄── 4, 9, 14, 17, 18
20 (i18n) ◄── 4, 9, 14, 17, 18
21 (MSW) ◄── 3, 8, 13, 17, 18
22 (full checkpoint) ◄── 15, 17, 19, 20, 21

23 (E2E) ◄── 22
25 (email) ── no dependencies
```

```json
{
  "waves": [
    {
      "wave": 1,
      "description": "Foundation — core domain, catalog, and email (no dependencies)",
      "tasks": [1, 24, 25]
    },
    {
      "wave": 2,
      "description": "Domain layers — queue, booking, payment, auth, ticket",
      "tasks": [2, 6, 11, 16, 18]
    },
    {
      "wave": 3,
      "description": "Application layers",
      "tasks": [3, 7, 12, 17]
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
      "description": "Integration — routes, i18n, MSW handlers",
      "tasks": [19, 20, 21]
    },
    {
      "wave": 8,
      "description": "Full application checkpoint",
      "tasks": [22]
    },
    {
      "wave": 9,
      "description": "E2E tests",
      "tasks": [23]
    }
  ]
}
```

## Task Dependency Graph

```
1 (core domain)
├── 2 (queue domain) ──► 3 (queue app/data) ──► 4 (queue controller) ──► 5 (checkpoint)
├── 6 (booking domain) ──► 7 (booking app) ──► 8 (booking data) ──► 9 (booking controller) ──► 10 (checkpoint)
├── 11 (payment domain) ──► 12 (payment app) ──► 13 (payment data) ──► 14 (payment controller) ──► 15 (checkpoint)
├── 16 (auth domain/app) ──► 17 (auth data/controller)
└── 18 (ticket module)

24 (catalog) ── no dependencies, can run parallel

19 (routes) ◄── 4, 9, 14, 17, 18
20 (i18n) ◄── 4, 9, 14, 17, 18
21 (MSW) ◄── 3, 8, 13, 17, 18
22 (full checkpoint) ◄── 15, 17, 19, 20, 21

23 (E2E) ◄── 22
25 (email) ── no dependencies
```

## Tasks

- [ ] 1. Extend core domain dengan CAPTCHA dan system-health protocols [NEW] `@owner:muzaki`
  - [ ] 1.1 Buat `src/core/domain/captcha.protocol.ts` dan `captcha.constants.ts` `@owner:muzaki`
    - _Requirements: 3.22, 12.4_
  - [ ] 1.2 Buat `src/core/domain/system-state.model.ts`, `system-health.protocol.ts`, `system-health-updates.protocol.ts` `@owner:muzaki`
    - _Requirements: BR-21, BR-22_
  - [ ] 1.3 Tulis unit tests di `src/core/domain/__tests__/system-state.model.test.ts` `@owner:muzaki`
    - _Requirements: 3.22, BR-21_

- [ ] 2. Align queue module — domain layer [ALIGN] `@owner:muzaki`
  - [ ] 2.1 Tulis ulang `src/modules/queue/domain/queue-state.model.ts` `@owner:muzaki`
    - _Requirements: 3.1, 3.2, 3.3, 3.3a, 3.13, 3.15, BR-21_
  - [ ] 2.2 Tulis ulang `src/modules/queue/domain/queue.protocol.ts` `@owner:muzaki`
    - _Requirements: 3.2, 3.5, 3.13, 3.22_
  - [ ] 2.3 Tulis ulang `src/modules/queue/domain/queue-updates.protocol.ts` `@owner:muzaki`
    - _Requirements: 3.2, 3.3, BR-16, BR-20_
  - [ ] 2.4 Tulis property tests queue-progress.rules `@owner:muzaki`

- [ ] 3. Align queue module — application dan data layers [ALIGN + NEW] `@owner:muzaki`
  - [ ] 3.1 Buat join-queue-with-captcha.use-case.ts `@owner:muzaki`
  - [ ] 3.2 Rename get-queue-state → get-customer-queue-state.use-case.ts `@owner:muzaki`
  - [ ] 3.3 Tulis ulang watch-queue-state.use-case.ts `@owner:muzaki`
  - [ ] 3.4 Tulis ulang http-queue.service.ts `@owner:muzaki`
  - [ ] 3.5 Tulis ulang sse-queue-updates.service.ts `@owner:muzaki`
  - [ ] 3.6 Update queue.module.ts `@owner:muzaki`

- [ ] 4. Align queue module — controller, views, dan route [ALIGN] `@owner:muzaki`
  - [ ] 4.1 Tulis ulang queue.controller.ts `@owner:muzaki`
  - [ ] 4.2 Tulis ulang queue.mapper.ts `@owner:muzaki`
  - [ ] 4.3 Update queue.queries.ts `@owner:muzaki`
  - [ ] 4.4 Update QueueView.tsx dan QueueContainer.tsx `@owner:muzaki`
  - [ ] 4.5 Tulis integration tests queue.controller.test.tsx `@owner:muzaki`

- [ ] 5. Checkpoint — queue module `@owner:muzaki`

- [ ] 6. Align booking module — domain layer [ALIGN + NEW] `@owner:muzaki`
  - [ ] 6.1 Tulis ulang booking-session.model.ts `@owner:muzaki`
  - [ ] 6.2 Update booking.protocol.ts `@owner:muzaki`
  - [ ] 6.3 Buat attendee.model.ts `@owner:muzaki`
  - [ ] 6.4 Buat nik-dedup.rules.ts `@owner:muzaki`
  - [ ] 6.5 Update can-add-ticket.rules.ts `@owner:muzaki`
  - [ ] 6.6 Update selection.reducer.ts `@owner:muzaki`
  - [ ] 6.7 Update booking.constants.ts `@owner:muzaki`
  - [ ] 6.8 Tulis property tests booking domain `@owner:muzaki`

- [ ] 7. Align booking module — application layer [ALIGN + NEW] `@owner:muzaki`
  - [ ] 7.1 Buat validate-nik.use-case.ts `@owner:muzaki`
  - [ ] 7.2 Buat submit-booking.use-case.ts `@owner:muzaki`
  - [ ] 7.3 Tulis unit tests submit-booking.use-case.test.ts `@owner:muzaki`

- [ ] 8. Align booking module — data layer [ALIGN] `@owner:muzaki`
  - [ ] 8.1 Tulis ulang http-booking.service.ts `@owner:muzaki`
  - [ ] 8.2 Tulis ulang booking-session.schema.ts `@owner:muzaki`

- [ ] 9. Align booking module — controller, views, dan module [ALIGN] `@owner:muzaki`
  - [ ] 9.1 Tulis ulang booking.controller.ts `@owner:muzaki`
  - [ ] 9.2 Tulis ulang booking.mapper.ts `@owner:muzaki`
  - [ ] 9.3 Update booking.queries.ts `@owner:muzaki`
  - [ ] 9.4 Tulis ulang BookingView.tsx `@owner:muzaki`
  - [ ] 9.5 Update BookingContainer.tsx dan CategoryRow.tsx `@owner:muzaki`
  - [ ] 9.6 Update booking.module.ts `@owner:muzaki`
  - [ ] 9.7 Update integration tests booking.controller.test.tsx `@owner:muzaki`

- [ ] 10. Checkpoint — booking module `@owner:muzaki`

- [ ] 11. Align payment module — domain layer [ALIGN] `@owner:akbar`
  - [ ] 11.1 Tulis ulang order.model.ts — PaymentMethod, PaymentInstruction, BankCode, OrderStatus `@owner:akbar`
    - _Requirements: 6.1, 6.3, 6.7, 6.11, 6.13, 6.16, BR-05_
  - [ ] 11.2 Tulis ulang order.protocol.ts — getAvailableMethods, retryPayment, getPaymentStatus `@owner:akbar`
    - _Requirements: 6.3, 6.11, 6.12, 6.19_
  - [ ] 11.3 Hapus order-updates.protocol.ts (SSE removed, polling-only) `@owner:akbar`
  - [ ] 11.4 Update order.rules.ts — canRetryPayment, canInitiatePayment, isFinalOrder `@owner:akbar`
    - _Requirements: 6.7, 6.8, 6.19_
  - [ ] 11.5 Update payment.constants.ts — PAYMENT_STATUS_POLL_INTERVAL_MS, MIN_RETRY_REMAINING_SECONDS `@owner:akbar`
    - _Requirements: 6.1, 6.7, 6.13, 6.19, BR-05, BR-06_

- [ ] 12. Align payment module — application layer [ALIGN + NEW] `@owner:akbar`
  - [ ] 12.1 Tulis ulang watch-order.use-case.ts → polling-based `@owner:akbar`
    - _Requirements: 6.12, 6.13_
  - [ ] 12.2 Update get-order.use-case.ts — rename orderId → bookingId `@owner:akbar`
  - [ ] 12.3 Update start-payment.use-case.ts — add BankCode param `@owner:akbar`
  - [ ] 12.4 Buat get-available-methods.use-case.ts [NEW] `@owner:akbar`
  - [ ] 12.5 Buat retry-payment.use-case.ts [NEW] `@owner:akbar`
  - [ ] 12.6 Update payment.use-cases.test.ts — Property 11 `@owner:akbar`

- [ ] 13. Align payment module — data layer [ALIGN] `@owner:akbar`
  - [ ] 13.1 Rename sse-order-updates.service.ts → http-payment-status.service.ts `@owner:akbar`
  - [ ] 13.2 Tulis ulang http-order.service.ts — new endpoints `@owner:akbar`
  - [ ] 13.3 Tulis ulang order.schema.ts — new Zod schemas `@owner:akbar`

- [ ] 14. Align payment module — controller, views, dan module [ALIGN] `@owner:akbar`
  - [ ] 14.1 Tulis ulang payment.controller.ts — polling, bank selection, retry flow `@owner:akbar`
    - _Requirements: 6.1, 6.2, 6.3, 6.11, 6.12, 6.13, 6.16, 6.19_
  - [ ] 14.2 Tulis ulang payment.queries.ts — polling query, mutations `@owner:akbar`
  - [ ] 14.3 Tulis ulang payment.mapper.ts — new types mapping `@owner:akbar`
  - [ ] 14.4 Tulis ulang PaymentView.tsx — bank selection UI, VA display, GoPay deeplink `@owner:akbar`
  - [ ] 14.5 Update payment.module.ts — register new use cases `@owner:akbar`
  - [ ] 14.6 Update integration tests payment controllers `@owner:akbar`

- [ ] 15. Checkpoint — payment module `@owner:akbar`

- [ ] 16. Buat auth module — domain dan application layers [NEW] `@owner:muzaki`
  - _Desain: ADR-0023 (Proposed). Tunggu BE menyepakati usulan perubahan kontrak di ADR-0023, terutama cara token magic link sampai ke verifikasi, sebelum 16.4, 16.7, dan 17.1_
  - [x] 16.1 Buat user.model.ts `@owner:muzaki`
    - _Jadi `account.model.ts` (Account, SavedNik, RegisterInput)_
  - [x] 16.2 Buat auth.protocol.ts `@owner:muzaki`
  - [x] 16.3 Buat nik-validation.rules.ts `@owner:muzaki`
    - _Jadi `account.rules.ts` (`isEmail`, `isNikFormat`)_
  - [x] 16.4 Buat request-magic-link.use-case.ts `@owner:muzaki`
  - [ ] 16.5 Buat validate-nik.use-case.ts (auth) `@owner:muzaki`
    - _Cek dulu apakah cukup memakai validasi NIK booking (`POST /nik/validate`, task 7.1)_
  - [ ] 16.6 Tulis property tests nik-validation.rules `@owner:muzaki`
  - [x] 16.7 Buat resend-magic-link.use-case.ts dan verify-magic-link.use-case.ts `@owner:muzaki`
    - _`verify-login.use-case.ts` lewat route same-origin `/api/auth/verify`_

- [x] 17. Buat auth module — data, controller, views, dan module [NEW] `@owner:muzaki`
  - [x] 17.1 Buat http-auth.service.ts `@owner:muzaki`
  - [x] 17.2 Buat login.controller.ts `@owner:muzaki`
  - [x] 17.3 Buat register.controller.ts `@owner:muzaki`
  - [x] 17.4 Update LoginContainer.tsx `@owner:muzaki`
  - [x] 17.5 Buat RegisterContainer.tsx `@owner:muzaki`
  - [x] 17.6 Buat auth.module.ts `@owner:muzaki`
  - [x] 17.7 Update di/container.ts `@owner:muzaki`
  - [x] 17.8 Tulis integration tests auth `@owner:muzaki`
    - _Test controller login, verify, register, akun, dan gateway `/api` dengan MSW_

- [x] 18. Buat ticket module [NEW] `@owner:akbar`
  - [x] 18.1 Buat ticket.model.ts dan ticket.protocol.ts `@owner:akbar`
    - _Requirements: 7.1, 7.5_
  - [x] 18.2 Buat get-ticket.use-case.ts dan get-my-tickets.use-case.ts `@owner:akbar`
  - [x] 18.3 Buat http-ticket.service.ts `@owner:akbar`
  - [x] 18.4 Buat ticket.controller.ts `@owner:akbar`
  - [x] 18.5 Buat TicketView.tsx `@owner:akbar`
  - [x] 18.6 Update TicketContainer.tsx `@owner:akbar`
  - [x] 18.7 Buat ticket.module.ts `@owner:akbar`

- [ ] 19. Update app route pages [ALIGN + NEW]
  - [ ] 19.1 Update queue page.tsx `@owner:muzaki`
  - [x] 19.2 Update login page.tsx `@owner:muzaki`
  - [x] 19.3 Buat register page.tsx `@owner:muzaki`
  - [x] 19.4 Buat verify page.tsx `@owner:muzaki`
    - _`/login/verify#token=...`; ditambah `/account` dan `/tickets`_
    - _Token akun disimpan lewat route same-origin di cookie httpOnly, tidak di URL atau `localStorage` (ADR-0023)_
  - [ ] 19.5 Update book page.tsx `@owner:muzaki`
  - [ ] 19.6 Update pay page.tsx — rename orderId → bookingId `@owner:akbar`
  - [ ] 19.7 Update ticket page.tsx `@owner:akbar`

- [ ] 20. Update i18n message keys [ALIGN]
  - [ ] 20.1 Tambahkan queue message keys `@owner:muzaki`
  - [x] 20.2 Tambahkan auth message keys `@owner:muzaki`
  - [ ] 20.3 Tambahkan payment message keys `@owner:akbar`
  - [ ] 20.4 Tulis i18n property tests `@owner:muzaki`

- [x] 21. MSW mock handlers [ALIGN] `@owner:shared`
  - [x] 21.1 Update handlers.ts — all v2.1 endpoints `@owner:shared`
    - _Handler per tag di `src/mocks/api/`, diuji terhadap contoh `src/core/data/http/openapi.json`_

- [ ] 22. Checkpoint — full application `@owner:shared`

- [ ] 23. E2E tests [NEW]
  - [ ] 23.1 Happy path E2E test `@owner:muzaki`
  - [ ] 23.2 Queue pause E2E test `@owner:muzaki`
  - [ ] 23.3 Payment retry E2E test `@owner:akbar`

- [x] 24. Align catalog/home module [ALIGN] `@owner:akbar`
  - [x] 24.1 Review event.model.ts — EventStatus alignment `@owner:akbar`
    - _Requirements: 1.1, 1.2, 1.3_
  - [x] 24.2 Review catalog.protocol.ts `@owner:akbar`
  - [x] 24.3 Update http-catalog.service.ts `@owner:akbar`
  - [x] 24.4 Update catalog.controller.ts — polling 5s, QUEUE_OPEN redirect `@owner:akbar`
    - _Requirements: 1.4, 2.1, 2.2_
  - [x] 24.5 Update CatalogContainer.tsx dan EventCard.tsx `@owner:akbar`
  - [x] 24.6 Update Home page.tsx `@owner:akbar`

- [ ] 25. HTML email templates [NEW] `@owner:muzaki`
  - [x] 25.1 Buat ticket-issued.mjml `@owner:muzaki`
    - _Requirements: 7.2, 7.3_
  - [x] 25.2 Buat booking-expired.mjml `@owner:muzaki`
  - [ ] 25.3 Buat payment-reminder.mjml `@owner:muzaki`
  - [x] 25.4 Update emails/build.mjs `@owner:muzaki`
  - [x] 25.5 Buat login-link.mjml dan verify-register.mjml (ADR-0023) `@owner:muzaki`

## Owner Summary

| Owner | Tasks | Modules |
|-------|-------|---------|
| **Akbar** | 11-15, 18, 19.6-19.7, 20.3, 23.3, 24 | Payment, Ticket, Catalog/Home |
| **Muzaki** | 1-10, 16-17, 19.1-19.5, 20.1-20.2, 20.4, 23.1-23.2, 25 | Core, Queue, Booking, Auth, Email |
| **Shared** | 21, 22 | MSW handlers, Final checkpoint |

## Notes

- Task ALIGN = update existing; NEW = create from scratch
- Timer/countdown berbasis server-authoritative `expiresAt` + offset (ADR-0005)
- Property tests menggunakan `fast-check`
- i18n tasks (20.1-20.3) harus sequential (write to same file)

---

## API Contract Alignment Tasks (Wave 0 — Pre-implementation)

> **Reference**: `docs/api/api-contract.md` dan `design.md Appendix A`

Task-task ini HARUS diselesaikan sebelum implementasi modul terkait untuk memastikan compatibility dengan API contract.

- [x] 26. Core HTTP client — API contract alignment [ALIGN] `@owner:shared`
  - [x] 26.1 Update `http-client.ts` dengan auth headers support (X-Grant-Token, X-Device-Id, X-Queue-Token)
    - _Requirements: API contract Authentication section_
  - [x] 26.2 Buat `api-response.schema.ts` untuk wrap/unwrap `{meta, data}` pattern
    - _Envelope dibuka di `fetch-http.client.ts`; tidak ada file schema terpisah_
  - [x] 26.3 Tambah snake_case → camelCase transformer di response parsing
    - _Per schema zod modul (`.transform()`), bukan transformer generik_
  - [x] 26.4 Update error handling untuk parse `meta.code` dan `meta.message`
    - _Service memetakan status HTTP per endpoint lewat `RequestOptions.errorCodes`_

- [ ] 27. Queue module types alignment [ALIGN] `@owner:muzaki`
  - [ ] 27.1 Update `QueueJoinResult` — tambah `event: { id, name }`
  - [ ] 27.2 Update `CustomerQueueState` — ganti `accessToken` → `grantToken`
  - [ ] 27.3 Update `queue.protocol.ts` — methods menerima `grantToken` parameter
  - [ ] 27.4 Update `queue.schema.ts` — snake_case mapping untuk API response

- [ ] 28. Booking module types alignment [ALIGN] `@owner:muzaki`
  - [ ] 28.1 Update `NikValidationResult` — tambah `name`, `status` fields
  - [ ] 28.2 Update `BookingResult` — tambah `event`, `tickets[]` dengan `holderName`, `summary`
  - [ ] 28.3 Update `BookingProtocol` — methods menerima `grantToken`, `deviceId?` parameters
  - [ ] 28.4 Update `booking.schema.ts` — snake_case mapping untuk API response

- [ ] 29. Payment module types alignment [ALIGN] `@owner:akbar`
  - [ ] 29.1 Buat `RetryPaymentResult` type untuk `POST /payments/{id}/retry`
  - [ ] 29.2 Update `OrderProtocol` — methods menerima `grantToken`, `deviceId?` parameters
  - [ ] 29.3 Update `order.schema.ts` — snake_case mapping untuk `instructions.va_number`, dll
  - [ ] 29.4 Update path: `orderId` → `bookingId` di semua payment endpoints

- [ ] 30. Ticket module types — new [NEW] `@owner:akbar`
  - [ ] 30.1 Buat `Ticket` type dengan fields dari `GET /users/me/tickets`
  - [ ] 30.2 Buat `ETicket` type dengan `qrCode`, `qrValue`, `instructions`
  - [ ] 30.3 Buat `TicketProtocol` dengan `getMyTickets`, `getETicket`
  - [ ] 30.4 Buat `ticket.schema.ts` untuk response parsing

- [ ] 31. Auth module saved-niks alignment [ALIGN] `@owner:muzaki`
  - [x] 31.1 Rename `NikFriend` → `SavedNik` sesuai API contract
  - [x] 31.2 Update endpoint paths: `/me/nik-friends/*` → `/accounts/me/saved-niks`
  - [ ] 31.3 Update `SavedNik` type — tambah `status: 'VERIFIED'`

## Updated Dependency Graph

```
26 (http client alignment) ──► 27, 28, 29, 30, 31 (all module alignments)
                                    │
                                    ▼
                              1-25 (existing tasks)
```

## Wave 0 Summary

| Task | Owner | Dependencies | Description |
|------|-------|--------------|-------------|
| 26 | shared | none | HTTP client API contract support |
| 27 | muzaki | 26 | Queue types alignment |
| 28 | muzaki | 26 | Booking types alignment |
| 29 | akbar | 26 | Payment types alignment |
| 30 | akbar | 26 | Ticket module types (new) |
| 31 | muzaki | 26 | Auth saved-niks alignment |

**Catatan**: Wave 0 tasks harus complete sebelum memulai Wave 1 (Task 1). Ini memastikan semua type definitions sudah selaras dengan API contract sebelum implementasi dimulai.

