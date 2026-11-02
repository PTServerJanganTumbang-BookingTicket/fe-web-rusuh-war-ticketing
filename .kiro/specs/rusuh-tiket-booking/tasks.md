# Implementation Plan: Rusuh Tiket Booking — Frontend Alignment v2.1

## Overview

Rencana implementasi ini mencakup tiga area kerja utama:
1. **Alignment** — tiga modul yang sudah ada (`queue`, `booking`, `payment`) disesuaikan ke API contracts v2.1
2. **New build** — modul `auth` dan `ticket` dibangun dari nol
3. **Infrastructure** — route pages, i18n message keys, MSW mock handlers, dan E2E tests

Urutan task mengikuti Clean Architecture: domain → application → data → controllers → views. Task ALIGN = update file yang ada; task NEW = buat file baru.

## Tasks

- [ ] 1. Extend core domain dengan CAPTCHA dan system-health protocols [NEW]
  - [~] 1.1 Buat `src/core/domain/captcha.protocol.ts` (`CaptchaProtocol`, `CaptchaValidationResult`) dan `src/core/domain/captcha.constants.ts` (`CAPTCHA_PREFETCH_BEFORE_SALE_MS = 300_000`, `CAPTCHA_REFRESH_INTERVAL_MS = 60_000`); tidak ada dependency ke React atau fetch
    - _Requirements: 3.22, 12.4_
  - [~] 1.2 Buat `src/core/domain/system-state.model.ts` (`CircuitBreakerState`, `SystemHealthState`), `src/core/domain/system-health.protocol.ts` (`SystemHealthProtocol`), dan `src/core/domain/system-health-updates.protocol.ts` (`SystemHealthUpdatesProtocol`)
    - _Requirements: BR-21, BR-22_
  - [~] 1.3 Tulis unit tests di `src/core/domain/__tests__/system-state.model.test.ts` — verifikasi constant values di `captcha.constants.ts` dan type narrowing `CircuitBreakerState`
    - _Requirements: 3.22, BR-21_

- [ ] 2. Align queue module — domain layer [ALIGN]
  - [~] 2.1 Tulis ulang `src/modules/queue/domain/queue-state.model.ts` — `WaitingRoomState` union baru dengan variant `waiting` (tambah field `ratePerMin`, `paused`), `granted`, `admitted` (rename `expiresAt` → `bookingExpiresAt`, tambah `serverTime`), `sold_out_temporary`, `sold_out_final`; tambahkan `CustomerQueueState`, `CustomerStateValue`, `NowServingResult`, `QueueJoinResult` types
    - _Requirements: 3.1, 3.2, 3.3, 3.3a, 3.13, 3.15, BR-21_
  - [~] 2.2 Tulis ulang `src/modules/queue/domain/queue.protocol.ts` — ganti `getState` dengan empat method baru: `joinQueue(eventId, captchaToken)`, `getMyQueueState(eventId)`, `getNowServing(eventId)`, `cancelQueue(eventId)`; hapus signature lama; tambahkan return types dari 2.1
    - _Requirements: 3.2, 3.5, 3.13, 3.22_
  - [~] 2.3 Tulis ulang `src/modules/queue/domain/queue-updates.protocol.ts` — ganti `watch(eventId, observer)` dengan `subscribe(eventId, observer, onGrant, onStalenessChange, onSoldOut)`; tambahkan `QueueSsePayload`, `GrantSseEvent`, `StatusSseEvent`, `SoldOutSseEvent` types sesuai design
    - _Requirements: 3.2, 3.3, BR-16, BR-20_
  - [~] 2.4 Tulis property tests di `src/modules/queue/domain/__tests__/queue-progress.rules.test.ts` — update/tambahkan test untuk **Property 5** dan **Property 6**
    - **Property 5: Queue Position Display Format** — posisi = `queueNumber - nowServing` untuk semua input valid; **Validates: Requirements 3.1, 3.18**
    - **Property 6: Estimated Wait Time Buffer** — ETA >= `position / rate × 1.2` untuk semua rate > 0; **Validates: Requirements 3.8, BR-11**

- [ ] 3. Align queue module — application dan data layers [ALIGN + NEW]
  - [~] 3.1 Buat `src/modules/queue/application/join-queue-with-captcha.use-case.ts` [NEW] — prefetch token via `captchaService.prefetchToken()`, panggil `queueService.joinQueue(eventId, token)`; jika `CAPTCHA_INVALID` refresh token dan retry sekali
    - _Requirements: 3.22, 12.4_
  - [~] 3.2 Tulis ulang `src/modules/queue/application/get-queue-state.use-case.ts` → rename file menjadi `get-customer-queue-state.use-case.ts`; return type `CustomerQueueState`; digunakan saat page load dan setelah SSE `grant` event (`onGrant` callback)
    - _Requirements: 3.5, 3.13, 3.21_
  - [~] 3.3 Tulis ulang `src/modules/queue/application/watch-queue-state.use-case.ts` — gunakan SSE `subscribe` callback model baru: `onGrant` memanggil `getCustomerQueueStateUseCase`; `onStalenessChange` update stale indicator; `onSoldOut` trigger `sold_out_final`; inject `captchaService` dari DI
    - _Requirements: 3.2, 3.3, 3.15, BR-20_
  - [~] 3.4 Tulis ulang `src/modules/queue/data/http-queue.service.ts` — implementasi 4 method `QueueProtocol`: `joinQueue` (POST `/events/{id}/queue/join`), `getMyQueueState` (GET `/events/{id}/queue/me`), `getNowServing` (GET `/events/{id}/queue/serving`), `cancelQueue`; hapus endpoint `/events/{id}/queue` lama; gunakan Zod schema untuk validasi response
    - _Requirements: 3.2, 3.5, 3.13_
  - [~] 3.5 Tulis ulang `src/modules/queue/data/sse-queue-updates.service.ts` — handler SSE events baru: default event (unnamed) → `observer.next(queueSsePayload)`; event `grant` (empty payload) → `onGrant()`; event `status` → `onStalenessChange(event)`; event `sold-out` → `onSoldOut()` lalu tutup stream; auth via cookie `queue_token` (web) atau `Authorization` header — **TIDAK via query string**
    - _Requirements: 3.2, 3.3, BR-16, BR-20_
  - [~] 3.6 Update `src/modules/queue/queue.module.ts` — daftarkan `joinQueueWithCaptchaUseCase`, `getCustomerQueueStateUseCase`; hapus `getQueueStateUseCase`; update `QueueRegistry` dan `QueueDependencies`; inject `captchaService` dari core module
    - _Requirements: (semua queue)_

- [ ] 4. Align queue module — controller, views, dan route [ALIGN]
  - [~] 4.1 Tulis ulang `src/modules/queue/controllers/queue.controller.ts` — state machine baru: `waiting` (dengan paused banner BR-21 tanpa kehilangan posisi), `waiting_slot` (position=0 polling 1s sesuai AC3a), `granted` (panggil `getCustomerQueueStateUseCase` setelah SSE `grant`), `admitted`, `sold_out_temporary`, `sold_out_final`; hapus `startSessionUseCase` mutation; gunakan `joinQueueWithCaptchaUseCase`
    - _Requirements: 3.3, 3.3a, 3.4, 3.13, 3.15, BR-21, BR-22_
  - [~] 4.2 Tulis ulang `src/modules/queue/controllers/queue.mapper.ts` — mapper untuk semua variant `WaitingRoomState` baru ke `QueueViewProps`; include paused flag, ETA, stale indicator, sold_out variants
    - _Requirements: 3.1, 3.8, 3.14, 3.15_
  - [~] 4.3 Update `src/modules/queue/controllers/queue.queries.ts` — polling fallback dengan interval dari `NowServingResult.pollAfterMs` (server-driven, bukan hardcoded); hapus polling query lama
    - _Requirements: 3.2, 3.17_
  - [~] 4.4 Update `src/modules/queue/views/QueueView.tsx` dan `QueueContainer.tsx` — render semua state baru: `paused` banner (BR-21), `waiting_slot` spinner + pesan "Menunggu kasir tersedia", `sold_out_temporary` (pilihan tunggu 15 menit atau keluar), `sold_out_final`; tampilkan posisi antrian, ETA, jumlah tiket available di state `waiting`
    - _Requirements: 3.1, 3.3a, 3.8, 3.10, 3.14, 3.15, 3.17, BR-21_
  - [~] 4.5 Tulis integration tests (MSW) di `src/modules/queue/controllers/__tests__/queue.controller.test.tsx` — update test untuk **Property 16**: transisi ke `waiting_slot` saat position=0; SSE `grant` event memicu `getMyQueueState`; `paused=true` menampilkan banner tanpa mengubah posisi
    - **Property 16: Waiting Slot State Polling** — polling 1s dimulai saat position=0 dan slot belum tersedia; **Validates: Requirements 3.3a**

- [~] 5. Checkpoint — queue module
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Align booking module — domain layer [ALIGN + NEW]
  - [~] 6.1 Tulis ulang `src/modules/booking/domain/booking-session.model.ts` — struktur nested `event`/`session`/`categories`/`rules`; `TicketCategory` ganti field `stock` → `available`, tambah `maxPerOrder`; tambahkan `BookingRules`, `BookingDetail`; hapus `BookingQuota`, `maskedNik`, `serverNow` dari root
    - _Requirements: 4.1, 4.2, 4.9, 5.1, 5.2, 5.3_
  - [~] 6.2 Update `src/modules/booking/domain/booking.protocol.ts` — tambahkan `validateNik(nik)`, `submitBooking(data)`, `getBooking(bookingId)`; tambahkan types: `NikValidationResult`, `BookingSubmitData` (dengan `holderEmail` per tiket, `contactEmail`), `BookingResult`, `BookingDetail`
    - _Requirements: 4.5a, 4.5b, 4.6, 4.7, 4.9_
  - [~] 6.3 Buat `src/modules/booking/domain/attendee.model.ts` [NEW] — `AttendeeInfo` (ticketIndex, categoryId, nik, holderEmail, nikSource: `'manual' | 'self' | 'saved'`, nikValidationStatus: `'pending' | 'valid' | 'invalid' | 'already_used'`), `BookingFormState`
    - _Requirements: 0.5, 4.5, 4.5a, 4.13_
  - [~] 6.4 Buat `src/modules/booking/domain/nik-dedup.rules.ts` [NEW] — pure functions: `findDuplicateNiks(niks: string[]): string[]` dan `validateNikUniqueness(niks: string[]): { valid: boolean; duplicates: string[] }`
    - _Requirements: 4.6, BR-09_
  - [~] 6.5 Update `src/modules/booking/domain/can-add-ticket.rules.ts` — ganti `stock` → `available` pada `canAddTicket` dan `validateTicketSelection`; align `validateTicketSelection` signature ke `Map<string, number>` untuk quantities
    - _Requirements: 4.3, 4.4, BR-01_
  - [~] 6.6 Update `src/modules/booking/domain/selection.reducer.ts` — `SelectionState` menggunakan `Map<string, number>` untuk `quantities` plus `totalTickets: number`; align `SelectionAction` (INCREMENT/DECREMENT/SET/RESET) ke design spec
    - _Requirements: 4.4, BR-01_
  - [~] 6.7 Update `src/modules/booking/domain/booking.constants.ts` — pastikan `STOCK_REFRESH_INTERVAL_MS = 15_000`; tambahkan `PAUSE_TTL_GRACE_SECONDS = 60`; `MAX_TICKETS_PER_TRANSACTION = 3` dan `TTL_BOOKING_SECONDS = 300` sudah ada
    - _Requirements: 4.12, BR-01, BR-22_
  - [~] 6.8 Tulis property tests di `src/modules/booking/domain/__tests__/` — update dan tambah tests untuk Properties 1, 2, 7, 8
    - **Property 1: NIK Format Validation** — `isValidNikFormat` menerima TEPAT 16 digit angka untuk semua input; **Validates: Requirements 0.2, 10.6, 10.7**
    - **Property 2: NIK Uniqueness Within Transaction** — `validateNikUniqueness` detect semua duplikat; **Validates: Requirements 0.6, 4.6**
    - **Property 7: Category Disabled When Stock Zero** — `canAddTicket` selalu false saat `available = 0`; **Validates: Requirements 4.3, 4.12**
    - **Property 8: Total Ticket Limit Enforcement** — increment diblokir saat `totalTickets >= 3`; **Validates: Requirements 4.4, BR-01**

- [ ] 7. Align booking module — application layer [ALIGN + NEW]
  - [~] 7.1 Buat `src/modules/booking/application/validate-nik.use-case.ts` [NEW] — cek `isValidNikFormat` terlebih dahulu (return `INVALID_NIK_FORMAT` tanpa hit API); panggil `bookingService.validateNik(nik)`; return `NikValidationResult`
    - _Requirements: 4.5a, 4.5b, 10.6_
  - [~] 7.2 Buat `src/modules/booking/application/submit-booking.use-case.ts` [NEW] — pre-check `validateNikUniqueness` sebelum hit API; jika ada duplikat return `DUPLICATE_NIK_IN_REQUEST` tanpa memanggil service; jika unik panggil `bookingService.submitBooking(data)` untuk atomic hold
    - _Requirements: 4.6, 4.9, BR-09_
  - [~] 7.3 Tulis unit tests di `src/modules/booking/application/__tests__/submit-booking.use-case.test.ts` — verifikasi guard `DUPLICATE_NIK_IN_REQUEST` tidak memanggil service; delegate ke service saat semua NIK unik
    - _Requirements: 4.6_

- [ ] 8. Align booking module — data layer [ALIGN]
  - [~] 8.1 Tulis ulang `src/modules/booking/data/http-booking.service.ts` — tambahkan implementasi `validateNik` (POST `/nik/validate`), `submitBooking` (POST `/bookings`), `getBooking` (GET `/bookings/{id}`); update `getSession` path dari `/events/{id}/booking-session` ke `GET /events/{id}/tickets`
    - _Requirements: 4.5a, 4.9, 5.1_
  - [~] 8.2 Tulis ulang `src/modules/booking/data/booking-session.schema.ts` — Zod schema aligned ke `TicketSelectionResponse` baru (nested `event`/`session`/`categories`/`rules`); `available` tidak `stock`
    - _Requirements: 4.1, 4.2, 5.1_

- [ ] 9. Align booking module — controller, views, dan module [ALIGN]
  - [~] 9.1 Tulis ulang `src/modules/booking/controllers/booking.controller.ts` — full ticket selection flow: state `AttendeeInfo[]` + `contactEmail`; `validateNikUseCase` on-blur per field; `submitBookingUseCase` mutation on submit; navigasi ke `/orders/{bookingId}/pay` (bukan hardcoded `/RB-00912/pay`); handle `DUKCAPIL_UNAVAILABLE` fail-closed (blokir submit); stock polling 15s
    - _Requirements: 0.5, 0.6, 4.5, 4.5a, 4.5b, 4.6, 4.9, 4.10, 5.4, 5.9_
  - [~] 9.2 Tulis ulang `src/modules/booking/controllers/booking.mapper.ts` — mapper `BookingSession` (nested) ke `BookingViewProps`; mapping `AttendeeInfo.nikValidationStatus` ke UI feedback states
    - _Requirements: 4.2, 4.5, 4.13_
  - [~] 9.3 Update `src/modules/booking/controllers/booking.queries.ts` — stock polling setiap `STOCK_REFRESH_INTERVAL_MS` (15s) dengan jitter; tambahkan mutation key untuk `submitBooking`
    - _Requirements: 4.12_
  - [~] 9.4 Tulis ulang `src/modules/booking/views/BookingView.tsx` — render NIK form: satu field `nikAttendee` per tiket, satu field `contactEmail` untuk semua tiket; on-blur validation feedback per field (valid/invalid/already_used); submit button disabled saat ada NIK duplikat atau status `invalid`; prefill dari `nikSource: 'self'` untuk tiket pertama
    - _Requirements: 0.5, 4.5, 4.5a, 4.6, 4.13, BR-09, BR-12_
  - [~] 9.5 Update `src/modules/booking/views/BookingContainer.tsx` dan `CategoryRow.tsx` — align ke `BookingSession` baru; `available` menggantikan `stock` di seluruh UI; disabled state saat `available = 0`
    - _Requirements: 4.1, 4.2, 4.3_
  - [~] 9.6 Update `src/modules/booking/booking.module.ts` — daftarkan `validateNikUseCase`, `submitBookingUseCase`; update `BookingRegistry` dan `BookingDependencies`
    - _Requirements: (semua booking)_
  - [~] 9.7 Update integration tests di `src/modules/booking/controllers/__tests__/booking.controller.test.tsx` — **Property 3**: N tiket dipilih → N field NIK dirender; **Property 9**: email format validation; submit diblokir saat NIK duplikat
    - **Property 3: Ticket Count Equals NIK Form Count** — N tiket = N NIK fields; **Validates: Requirements 0.5, 4.5**
    - **Property 9: Email Format Validation** — validasi lulus hanya jika ada `@` + domain + TLD; **Validates: Requirements 4.13**

- [~] 10. Checkpoint — booking module
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 11. Align payment module — domain layer [ALIGN]
  - [~] 11.1 Tulis ulang `src/modules/payment/domain/order.model.ts` — `PaymentMethod` menjadi `'bank_transfer' | 'gopay'`; `PaymentInstruction` shape baru: `bank_transfer` → `{ type, bank: BankCode, vaNumber }`; `gopay` → `{ type, qrUrl, deeplinkUrl }`; tambahkan `AvailableMethod`, `BankCode`, `PaymentStatusResult`; `OrderStatus` tambahkan `PENDING_CANCELLATION`; ganti `orderId` → `bookingId`; ganti flat `expiresAt`/`serverNow` → nested `paymentTtl`; hapus `PaymentOutcome` type
    - _Requirements: 6.1, 6.3, 6.7, 6.11, 6.13, 6.16, BR-05_
  - [~] 11.2 Tulis ulang `src/modules/payment/domain/order.protocol.ts` — tambahkan `getAvailableMethods(bookingId)`, `retryPayment(bookingId)`, `getPaymentStatus(bookingId)`; update `get(bookingId)` dan `initiatePayment(bookingId, method, bank?)`; hapus signature lama
    - _Requirements: 6.3, 6.11, 6.12, 6.19_
  - [~] 11.3 Hapus `src/modules/payment/domain/order-updates.protocol.ts` — SSE untuk payment dihapus (payment menggunakan polling-only per design); update semua import yang merujuk ke file ini (terutama `payment.module.ts` dan `sse-order-updates.service.ts`)
    - _Requirements: (design decision: polling-only for payment)_
  - [~] 11.4 Update `src/modules/payment/domain/order.rules.ts` — `canRetryPayment` cek status `FAILED`; `canInitiatePayment` cek `PENDING_PAYMENT`; `isFinalOrder` align ke `OrderStatus` baru (PAID/FAILED/EXPIRED)
    - _Requirements: 6.7, 6.8, 6.19_
  - [~] 11.5 Update `src/modules/payment/domain/payment.constants.ts` — tambahkan `PAYMENT_STATUS_POLL_INTERVAL_MS = 3_000`, `MIN_RETRY_REMAINING_SECONDS = 60`; `TTL_PAYMENT_SECONDS = 600` dan `GRACE_PERIOD_SECONDS = 30` tidak berubah
    - _Requirements: 6.1, 6.7, 6.13, 6.19, BR-05, BR-06_

- [ ] 12. Align payment module — application layer [ALIGN + NEW]
  - [~] 12.1 Tulis ulang `src/modules/payment/application/watch-order.use-case.ts` → polling-based: poll `orderService.getPaymentStatus(bookingId)` setiap `PAYMENT_STATUS_POLL_INTERVAL_MS` (3s) hingga PAID/FAILED/EXPIRED; ganti SSE-based watch dengan polling loop menggunakan `setInterval`
    - _Requirements: 6.12, 6.13_
  - [~] 12.2 Update `src/modules/payment/application/get-order.use-case.ts` — rename param `orderId` → `bookingId` sesuai contract baru
    - _Requirements: 6.2_
  - [~] 12.3 Update `src/modules/payment/application/start-payment.use-case.ts` — align ke `initiatePayment(bookingId, method, bank?)` dengan parameter `BankCode` optional untuk VA; rename `orderId` → `bookingId`
    - _Requirements: 6.3, 6.11_
  - [~] 12.4 Buat `src/modules/payment/application/get-available-methods.use-case.ts` [NEW] — panggil `orderService.getAvailableMethods(bookingId)`
    - _Requirements: 6.3, 6.11_
  - [~] 12.5 Buat `src/modules/payment/application/retry-payment.use-case.ts` [NEW] — panggil `orderService.retryPayment(bookingId)` untuk membatalkan transaksi lama dan kembalikan booking ke status HELD
    - _Requirements: 6.19_
  - [~] 12.6 Update `src/modules/payment/application/__tests__/payment.use-cases.test.ts` — **Property 11**: mapping instruction type; `canRetryPayment` hanya true saat FAILED; `canInitiatePayment` hanya true saat PENDING_PAYMENT
    - **Property 11: Payment Instruction Type Mapping** — bank_transfer → VA number; gopay → deep link; **Validates: Requirements 6.3, 6.11**

- [ ] 13. Align payment module — data layer [ALIGN]
  - [~] 13.1 Tulis ulang `src/modules/payment/data/sse-order-updates.service.ts` → rename file menjadi `http-payment-status.service.ts` — implementasi polling `GET /payments/{id}/status`; hapus SSE implementation sepenuhnya
    - _Requirements: 6.12, 6.13_
  - [~] 13.2 Tulis ulang `src/modules/payment/data/http-order.service.ts` — tambahkan `getAvailableMethods` (GET `/payments/{id}/methods`), `retryPayment` (POST `/payments/{id}/retry`), `getPaymentStatus` (GET `/payments/{id}/status`); update `initiatePayment` dengan `BankCode` param optional; ganti `orderId` → `bookingId` di semua method dan endpoint paths
    - _Requirements: 6.3, 6.11, 6.12, 6.19_
  - [~] 13.3 Tulis ulang `src/modules/payment/data/order.schema.ts` — Zod schemas aligned ke model baru: `Order`, `AvailableMethod`, `PaymentInstruction` (union discriminated), `PaymentStatusResult`
    - _Requirements: 6.1, 6.3, 6.11_

- [ ] 14. Align payment module — controller, views, dan module [ALIGN]
  - [~] 14.1 Tulis ulang `src/modules/payment/controllers/payment.controller.ts` — polling status via TanStack Query refetch 3s (ganti SSE `useLiveUpdates`); bank sub-selection state (BCA/BNI/BRI/CIMB) untuk VA; `retryPayment` flow saat FAILED; param `bookingId` (bukan `orderId`); status EXCLUSIVELY dari backend (IGNORE URL params sesuai Req 6.12); tampilkan "Menunggu konfirmasi" saat `PENDING_CANCELLATION`
    - _Requirements: 6.1, 6.2, 6.3, 6.11, 6.12, 6.13, 6.16, 6.19_
  - [~] 14.2 Tulis ulang `src/modules/payment/controllers/payment.queries.ts` — hapus SSE `useLiveUpdates`; polling query `refetchInterval: PAYMENT_STATUS_POLL_INTERVAL_MS` dengan jitter; mutation untuk `initiatePayment` dan `retryPayment`; query key menggunakan `bookingId`
    - _Requirements: 6.12, 6.13_
  - [~] 14.3 Tulis ulang `src/modules/payment/controllers/payment.mapper.ts` — map `Order`/`PaymentInstruction`/`AvailableMethod` ke view props; bank selection rendering; GoPay deep link vs QR URL per platform
    - _Requirements: 6.3, 6.11, 6.16_
  - [~] 14.4 Tulis ulang `src/modules/payment/views/PaymentView.tsx` — bank selection UI (radio BCA/BNI/BRI/CIMB muncul saat `bank_transfer` dipilih); tampilkan VA number; GoPay deep link button; method retry button saat `canRetryPayment`; hapus `FakeQr` dari production path (pindahkan ke mock-only)
    - _Requirements: 6.3, 6.11, 6.15, 6.16, 6.19_
  - [~] 14.5 Update `src/modules/payment/payment.module.ts` — daftarkan `getAvailableMethodsUseCase`, `retryPaymentUseCase`; hapus `orderUpdatesService` SSE; update `PaymentRegistry` dan `PaymentDependencies`; update import ke `http-payment-status.service.ts`
    - _Requirements: (semua payment)_
  - [~] 14.6 Update integration tests di `src/modules/payment/controllers/__tests__/` — polling advance status PENDING→PAID; `retryPayment` flow aktif saat FAILED; bank selection mengubah sub-state; **Property 11** diverifikasi via mapper
    - **Property 11: Payment Instruction Type Mapping** — **Validates: Requirements 6.3, 6.11**

- [~] 15. Checkpoint — payment module
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 16. Buat auth module — domain dan application layers [NEW]
  - [~] 16.1 Buat `src/modules/auth/domain/user.model.ts` — types `User` (id, email, maskedNik, emailVerified, consentGiven, consentTimestamp), `SavedNik` (id, nikMasked, label, verifiedAt, status: `'VERIFIED'`), `NikValidationStatus`
    - _Requirements: 0.1, 0.2, 0.10, 0.11_
  - [~] 16.2 Buat `src/modules/auth/domain/auth.protocol.ts` — `AuthProtocol` dengan magic link flow (`requestMagicLink`, `resendMagicLink`, `verifyMagicLink`), `register(data: RegisterData)`, saved-niks CRUD (`getSavedNiks`, `addSavedNik`, `removeSavedNik`); tambahkan `AuthResult` (dengan `BookingRedirectContext` optional), `RegisterData` (consent field wajib, tidak bisa dilewati)
    - _Requirements: 0.1, 0.7, 0.8, 0.8a, 0.8b, 0.10, 0.11, 0.12_
  - [~] 16.3 Buat `src/modules/auth/domain/nik-validation.rules.ts` — pure functions: `NIK_LENGTH = 16`, `isValidNikFormat(nik: string): boolean` (`/^\d{16}$/`), `maskNik(nik: string): string` (tampilkan 3 char pertama + asterisks + 3 char terakhir)
    - _Requirements: 0.2, 10.6, 10.7_
  - [~] 16.4 Buat `src/modules/auth/application/request-magic-link.use-case.ts` — validasi format email, panggil `authService.requestMagicLink(email)`; buat juga `resend-magic-link.use-case.ts`
    - _Requirements: 0.7, 0.8_
  - [~] 16.5 Buat `src/modules/auth/application/validate-nik.use-case.ts` (auth module) — cek `isValidNikFormat` terlebih dahulu, lalu `authService.validateNik` untuk Dukcapil check saat registrasi; beda file dari `booking/application/validate-nik.use-case.ts`
    - _Requirements: 0.2, 0.9_
  - [~] 16.6 Tulis property tests di `src/modules/auth/domain/__tests__/nik-validation.rules.test.ts` [NEW] — **Property 1**: `isValidNikFormat` menerima HANYA string 16 digit angka; `maskNik` selalu menghasilkan string dengan panjang yang diharapkan dan karakter non-digit di posisi tengah
    - **Property 1: NIK Format Validation** — **Validates: Requirements 0.2, 10.6, 10.7**

- [ ] 17. Buat auth module — data, controller, views, dan module [NEW]
  - [~] 17.1 Buat `src/modules/auth/data/http-auth.service.ts` — implementasi `AuthProtocol`: POST `/auth/magic-link`, POST `/auth/magic-link/resend`, GET `/auth/verify`, POST `/auth/register`, GET/POST/DELETE `/accounts/me/saved-niks/{id}`; gunakan Zod schema untuk validasi response
    - _Requirements: 0.1, 0.7, 0.8, 0.10, 0.11, 0.12_
  - [~] 17.2 Buat `src/modules/auth/controllers/login.controller.ts` — form magic link: field email, submit → `requestMagicLinkUseCase`; resend countdown; states: `idle` | `sending` | `sent` | `error`
    - _Requirements: 0.7, 0.8_
  - [~] 17.3 Buat `src/modules/auth/controllers/register.controller.ts` — form registrasi: fields email, NIK dengan on-blur Dukcapil validation; consent checkbox (wajib, **tidak boleh pre-checked** sesuai AC8a); submit diblokir jika consent unchecked; saved-niks CRUD; expose `consentText` untuk display
    - _Requirements: 0.2, 0.7, 0.8a, 0.8b, 0.9, 0.10, 0.11, 0.12_
  - [~] 17.4 Update `src/modules/auth/views/LoginContainer.tsx` — align ke `login.controller` (magic link form, hapus password field placeholder jika ada)
    - _Requirements: 0.7_
  - [~] 17.5 Buat `src/modules/auth/views/RegisterContainer.tsx` [NEW] — form registrasi dengan consent checkbox wajib; teks PDP compliance sesuai AC8a; NIK input dengan masked display; link ke Privacy Policy
    - _Requirements: 0.2, 0.8a, 0.8b, 0.9_
  - [~] 17.6 Buat `src/modules/auth/auth.module.ts` [NEW] — daftarkan `authService`, `requestMagicLinkUseCase`, `validateNikUseCase` (auth); buat `AuthRegistry` type dan `AuthDependencies`
    - _Requirements: (semua auth)_
  - [~] 17.7 Update `src/di/container.ts` — tambahkan `AuthRegistry` dan `TicketRegistry` ke `AppRegistry`; panggil `authModule()` dan `ticketModule()` di `createAppContainer`
    - _Requirements: (wiring semua modul)_
  - [~] 17.8 Tulis integration tests (MSW) di `src/modules/auth/controllers/__tests__/` [NEW] — consent unchecked memblokir submit registrasi; magic link request flow; resend limit enforcement
    - _Requirements: 0.8a, 0.10_

- [ ] 18. Buat ticket module [NEW]
  - [~] 18.1 Buat `src/modules/ticket/domain/ticket.model.ts` (types: `Ticket`, `ETicket` dengan QR code URL, `TicketStatus`) dan `src/modules/ticket/domain/ticket.protocol.ts` (`TicketProtocol` dengan `getMyTickets` dan `getETicket`)
    - _Requirements: 7.1, 7.5_
  - [~] 18.2 Buat `src/modules/ticket/application/get-ticket.use-case.ts` dan `src/modules/ticket/application/get-my-tickets.use-case.ts`
    - _Requirements: 7.1_
  - [~] 18.3 Buat `src/modules/ticket/data/http-ticket.service.ts` — GET `/users/me/tickets`, GET `/tickets/{id}/eticket`
    - _Requirements: 7.1_
  - [~] 18.4 Buat `src/modules/ticket/controllers/ticket.controller.ts` — load e-tiket dengan QR code; loading/error/success states; tampilkan NIK tersamar per tiket
    - _Requirements: 7.1_
  - [~] 18.5 Buat `src/modules/ticket/views/TicketView.tsx` [NEW] — tampilkan e-tiket dengan QR code image, NIK_Attendee tersamar, kategori tiket, nomor bangku
    - _Requirements: 7.1_
  - [~] 18.6 Update `src/modules/ticket/views/TicketContainer.tsx` — align ke `ticket.controller` baru
    - _Requirements: 7.1_
  - [~] 18.7 Buat `src/modules/ticket/ticket.module.ts` [NEW] — daftarkan `ticketService`, `getTicketUseCase`, `getMyTicketsUseCase`; buat `TicketRegistry`
    - _Requirements: 7.1_

- [ ] 19. Update app route pages [ALIGN + NEW]
  - [~] 19.1 Update `src/app/events/[eventId]/queue/page.tsx` — pastikan `eventId` di-pass ke `QueueContainer` yang sudah dialign; import dari module queue baru
    - _Requirements: 3.1, 3.2, 3.3_
  - [~] 19.2 Update `src/app/(auth)/login/page.tsx` — gunakan `LoginContainer` dengan magic link form
    - _Requirements: 0.7_
  - [~] 19.3 Buat `src/app/(auth)/register/page.tsx` [NEW] — gunakan `RegisterContainer` dengan consent checkbox
    - _Requirements: 0.8a, 0.9_
  - [~] 19.4 Buat `src/app/(auth)/verify/page.tsx` [NEW] — handle magic link verification: baca token dari query param, panggil `verifyMagicLink`, redirect ke `returnUrl` atau home
    - _Requirements: 0.7, 0.8_
  - [~] 19.5 Update `src/app/events/[eventId]/book/page.tsx` — align dengan NIK form flow baru dari `BookingContainer`
    - _Requirements: 4.5, 4.9_
  - [~] 19.6 Update `src/app/orders/[orderId]/pay/page.tsx` dan `layout.tsx` — ganti param name `orderId` → `bookingId` di params destructuring; gunakan `PaymentContainer` yang sudah dialign
    - _Requirements: 6.1, 6.3_
  - [~] 19.7 Update `src/app/orders/[orderId]/ticket/page.tsx` — gunakan `TicketContainer` baru
    - _Requirements: 7.1_

- [ ] 20. Update i18n message keys [ALIGN]
  - [~] 20.1 Tambahkan message keys queue baru ke `src/core/i18n/messages.*.ts` — keys: `queue.paused.*`, `queue.waiting_slot.*`, `queue.sold_out_temporary.*`, `queue.sold_out_final.*`, `queue.granted.*`; dalam Bahasa Indonesia (default) dan English
    - _Requirements: 3.3, 3.3a, 3.15, BR-21_
  - [~] 20.2 Tambahkan message keys auth ke `src/core/i18n/messages.*.ts` — keys: `auth.login.*`, `auth.register.*`, `auth.consent.*`, `auth.saved_niks.*`, `auth.verify.*`; dalam Bahasa Indonesia dan English
    - _Requirements: 0.7, 0.8a, 0.10_
  - [~] 20.3 Tambahkan message keys booking + payment baru ke `src/core/i18n/messages.*.ts` — keys: `booking.nik.*`, `booking.submit.*`, `booking.dukcapil_unavailable`, `payment.available_methods.*`, `payment.pending_cancellation.*`; dalam Bahasa Indonesia dan English
    - _Requirements: 4.5a, 4.5b, 6.7, 6.11, 6.13_
  - [~] 20.4 Tulis property tests di `src/core/i18n/__tests__/` [NEW] — **Property 12** dan **Property 13**
    - **Property 12: Error Code to i18n Mapping** — setiap `ApiErrorCode` memiliki mapping i18n key yang terdaftar; **Validates: Requirements 4.16, 13.5**
    - **Property 13: Language Toggle Consistency** — switching bahasa mengganti SEMUA string di halaman tanpa ada yang tertinggal dalam bahasa sebelumnya; **Validates: Requirements 13.2, 13.3**

- [ ] 21. Tulis ulang MSW mock handlers untuk API contracts v2.1
  - [~] 21.1 Tulis ulang `src/mocks/handlers.ts` — queue endpoints baru (POST `/events/{id}/queue/join`, GET `/me`, GET `/serving`, SSE stream dengan 3 event types: default/`grant`/`status`/`sold-out`); booking endpoints (POST `/nik/validate`, POST `/bookings`, GET `/bookings/{id}`); payment endpoints (GET `/payments/{id}/methods`, POST `/payments/{id}`, POST `/payments/{id}/retry`, GET `/payments/{id}/status` polling); auth endpoints (magic link, register, saved-niks); ticket endpoints; ganti `orderId` → `bookingId` di semua mock; hapus endpoint lama (`/events/{id}/queue`, `/events/{id}/booking-session`, `/orders/{id}`, dll.)
    - _Requirements: (semua modul — digunakan oleh integration dan E2E tests)_

- [~] 22. Checkpoint — full application
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 23. Tulis E2E tests untuk critical user journeys [NEW]
  - [~] 23.1 Tulis Playwright test di `tests/` — happy path: Home → Queue (SSE bergerak) → Booking (3 tiket, isi NIK unik, email valid) → Payment (VA BCA) → E-tiket ditampilkan
    - _Requirements: 1.2, 3.2, 4.9, 6.3, 7.1_
  - [~] 23.2 Tulis Playwright test — queue pause flow: join queue → SSE `paused=true` → banner "menunggu" tampil → posisi tidak hilang; TTL booking extended +60 detik (BR-22)
    - _Requirements: BR-21, BR-22_
  - [~] 23.3 Tulis Playwright test — payment retry: pilih VA → payment status FAILED → klik ganti metode → pilih GoPay → `retryPayment` → payment PAID
    - _Requirements: 6.3, 6.16, 6.19_

## Notes

- Task bertanda `*` adalah opsional dan bisa dilewati untuk MVP yang lebih cepat
- Setiap task mereferensikan requirements spesifik untuk traceabilitas
- **ALIGN** = update file yang sudah ada ke API contracts v2.1; **NEW** = buat file baru dari nol
- Timer dan countdown selalu berbasis `expiresAt` server-authoritative + offset (ADR-0005) — jangan gunakan countdown lokal tanpa offset
- Property tests menggunakan `fast-check` sesuai testing strategy di design document
- Tasks i18n (20.1, 20.2, 20.3) menulis ke file yang sama — harus dieksekusi berurutan, tidak paralel
- `simulate-payment-outcome.use-case.ts` dan `http-payment-simulator.service.ts` tidak dihapus; dipertahankan sebagai dev-only utility, tapi tidak termasuk `PaymentRegistry` production

## Task Dependency Graph

```json
{
  "waves": [
    {
      "id": 0,
      "tasks": ["1.1", "1.2", "2.1", "6.3", "6.4", "6.7", "11.5", "16.1", "16.3", "18.1"]
    },
    {
      "id": 1,
      "tasks": ["1.3", "2.2", "2.3", "6.1", "6.5", "6.6", "11.1", "16.2", "16.6", "18.2"]
    },
    {
      "id": 2,
      "tasks": ["2.4", "3.1", "3.2", "6.2", "6.8", "11.2", "11.3", "11.4", "16.4", "16.5", "18.3"]
    },
    {
      "id": 3,
      "tasks": ["3.3", "3.4", "7.1", "7.2", "12.1", "12.2", "12.3", "12.4", "12.5", "17.1", "18.4"]
    },
    {
      "id": 4,
      "tasks": ["3.5", "7.3", "8.1", "8.2", "12.6", "13.1", "13.2", "13.3", "17.2", "17.3", "18.5"]
    },
    {
      "id": 5,
      "tasks": ["3.6", "9.1", "9.2", "9.3", "14.1", "14.2", "14.3", "17.4", "17.5", "18.6", "18.7"]
    },
    {
      "id": 6,
      "tasks": ["4.1", "4.2", "4.3", "9.4", "9.5", "9.6", "14.4", "14.5", "17.6", "20.1"]
    },
    {
      "id": 7,
      "tasks": ["4.4", "4.5", "9.7", "14.6", "17.7", "17.8", "20.2"]
    },
    {
      "id": 8,
      "tasks": ["19.1", "19.2", "19.3", "19.4", "19.5", "19.6", "19.7", "20.3"]
    },
    {
      "id": 9,
      "tasks": ["20.4", "21.1"]
    },
    {
      "id": 10,
      "tasks": ["23.1", "23.2", "23.3"]
    }
  ]
}
```
