# Task Completion Investigation Report

## Summary

Berdasarkan investigasi kode terhadap tasks.md, ditemukan beberapa task yang statusnya perlu diperbarui:

**Temuan Utama:**
1. **Task 19.7 (ticket page.tsx)** — **DONE**: File sudah ada di `src/app/tickets/[ticketId]/page.tsx`
2. **Task 23 (E2E tests)** — **PARTIALLY DONE**: Happy path dan beberapa skenario sudah ada, namun tidak semua spesifik skenario (queue pause, payment retry) terpisah
3. **Task 27 (Queue types alignment)** — **PARTIALLY DONE**: Queue schema sudah punya `event: { id, name }` dan menggunakan `grant_token`, tapi QueueState model masih pakai `accessToken`
4. **Task 30 (Ticket module types)** — **DONE**: Semua file sudah lengkap dengan tipe yang sesuai

---

## Detailed Findings

### Task 1: Core domain CAPTCHA dan system-health protocols [NOT DONE]

| Subtask | Status | Evidence |
|---------|--------|----------|
| 1.1 captcha.protocol.ts, captcha.constants.ts | ❌ NOT DONE | File tidak ditemukan di `src/core/domain/` |
| 1.2 system-state.model.ts, system-health.protocol.ts, system-health-updates.protocol.ts | ❌ NOT DONE | File tidak ditemukan |
| 1.3 Unit tests system-state.model.test.ts | ❌ NOT DONE | File tidak ditemukan |

---

### Task 3.1: join-queue-with-captcha.use-case.ts [NOT DONE]

| Subtask | Status | Evidence |
|---------|--------|----------|
| 3.1 join-queue-with-captcha.use-case.ts | ❌ NOT DONE | File tidak ditemukan di `src/modules/queue/application/` |

**Note:** Queue join functionality ada di `http-queue.service.ts` tapi bukan sebagai use case terpisah dengan CAPTCHA.

---

### Task 5, 10, 15, 22: Checkpoints [SKIPPED]

Manual verification checkpoints — tidak perlu dicek di kode.

---

### Task 16.5: validate-nik.use-case.ts (auth) [NOT DONE]

| Status | Evidence |
|--------|----------|
| ❌ NOT DONE | Tidak ada file `validate-nik.use-case.ts` di `src/modules/auth/application/` |

**Note:** Ada `validate-nik.use-case.ts` di **booking** module (`src/modules/booking/application/validate-nik.use-case.ts`), tapi bukan di auth module. Task ini mungkin memang tidak diperlukan karena validasi NIK lewat booking module sudah cukup (seperti catatan di tasks.md: "_Cek dulu apakah cukup memakai validasi NIK booking_").

Files di auth/application:
- add-saved-nik.use-case.ts
- get-account.use-case.ts
- get-event-summary.use-case.ts
- get-profile.use-case.ts
- list-saved-niks.use-case.ts
- register-account.use-case.ts
- remove-saved-nik.use-case.ts
- request-magic-link.use-case.ts
- resend-magic-link.use-case.ts
- resend-verification.use-case.ts
- sign-out.use-case.ts
- update-saved-nik.use-case.ts
- verify-login.use-case.ts

---

### Task 16.6: property tests nik-validation.rules [PARTIALLY DONE]

| Status | Evidence |
|--------|----------|
| ⚠️ PARTIALLY DONE | Test ada di `src/modules/auth/domain/__tests__/account.rules.test.ts` |

**Detail:**
- File `account.rules.test.ts` sudah ada dan menguji `isNikFormat` dan `validateSavedNikInput`
- Namun bukan menggunakan **property testing** dengan `fast-check` seperti yang diminta
- Test yang ada adalah unit test biasa dengan contoh statis

---

### Task 19.7: ticket page.tsx [DONE] ✅

| Status | Evidence |
|--------|----------|
| ✅ DONE | `src/app/tickets/[ticketId]/page.tsx` exists |

**Files found:**
- `src/app/tickets/page.tsx` — halaman list tiket
- `src/app/tickets/layout.tsx` — layout
- `src/app/tickets/[ticketId]/page.tsx` — halaman detail e-ticket

---

### Task 20.4: i18n property tests [NOT DONE]

| Status | Evidence |
|--------|----------|
| ❌ NOT DONE | Tidak ada property test yang memverifikasi key match antara id.messages.ts dan en.messages.ts |

**Detail:**
- Ada test di `src/core/i18n/__tests__/en.messages.test.ts` yang mengecek:
  - Placeholder consistency antara id dan en
  - Semua teks layar fokus sudah diterjemahkan
- Namun ini bukan **property test** menggunakan `fast-check`
- Test yang ada sudah mencukupi untuk validasi key matching secara fungsional

---

### Task 23: E2E tests [PARTIALLY DONE]

| Subtask | Status | Evidence |
|---------|--------|----------|
| 23.1 Happy path E2E | ✅ DONE | `e2e/happy-path.spec.ts` — full flow home → queue → booking → payment |
| 23.2 Queue pause E2E | ❌ NOT DONE | Tidak ada test khusus queue pause |
| 23.3 Payment retry E2E | ❌ NOT DONE | Ada test payment failed, tapi bukan retry flow |

**E2E Files found:**
- `e2e/happy-path.spec.ts` — alur utama berhasil dan VA gagal
- `e2e/booking.spec.ts` — detail ticket, batas tiket, timer warning
- `e2e/expiry-and-guards.spec.ts` — booking expiry, payment expiry, guards
- `e2e/home.spec.ts` — home page tests

**Ada juga fixme tests untuk fitur yang belum diimplementasi:**
- `test.fixme("stok habis saat submit...")`
- `test.fixme("slot diambil alih tab atau perangkat lain...")`

---

### Task 25.3: payment-reminder.mjml [NOT DONE]

| Status | Evidence |
|--------|----------|
| ❌ NOT DONE | File tidak ditemukan di `emails/` |

**MJML files found:**
- `emails/booking-expired.mjml` ✅
- `emails/login-link.mjml` ✅
- `emails/ticket-issued.mjml` ✅
- `emails/verify-register.mjml` ✅
- `emails/partials/` (attributes, footer, header)

**Missing:**
- `emails/payment-reminder.mjml` ❌

---

### Task 27: Queue module types alignment [PARTIALLY DONE]

| Subtask | Status | Evidence |
|---------|--------|----------|
| 27.1 QueueJoinResult dengan `event: { id, name }` | ✅ DONE | `queue-state.schema.ts` line 13: `event: z.object({ id: z.string(), name: z.string() })` |
| 27.2 CustomerQueueState grantToken vs accessToken | ⚠️ PARTIAL | Schema uses `grant_token`, but `QueueState` model uses `accessToken` |
| 27.3 queue.protocol.ts methods dengan grantToken | ❌ NOT DONE | Protocol tidak menerima grantToken parameter |
| 27.4 queue.schema.ts snake_case mapping | ✅ DONE | Transform sudah ada di schema |

**Detail Task 27.2:**
- `queue-state.schema.ts` line 24-28: Schema parsing sudah menggunakan `grant_token`:
  ```typescript
  const grantedStates = z.object({
    state: z.enum(["GRANTED", "SELECTING"]),
    grant_token: z.string(),
    booking_expires_at: z.string(),
  });
  ```
- Tapi `queue-state.model.ts` line 6 masih menggunakan `accessToken`:
  ```typescript
  | { status: "admitted"; eventName: string; accessToken: string; expiresAt: string }
  ```
- `toQueueState()` function maps `grant_token` → `accessToken` (line 69)

**Rekomendasi:** Rename `accessToken` → `grantToken` di `QueueState` model untuk konsistensi dengan API contract.

---

### Task 28: Booking module types alignment [PARTIALLY DONE]

| Subtask | Status | Evidence |
|---------|--------|----------|
| 28.1 NikValidationResult dengan `name`, `status` | ✅ DONE | `booking-request.model.ts` — `NikCheck` type punya `status` dan `name` |
| 28.2 BookingResult dengan `event`, `tickets[]`, `holderName`, `summary` | ❌ NOT DONE | `CreatedBooking` hanya punya `{ bookingId: string }` |
| 28.3 BookingProtocol dengan grantToken, deviceId params | ❌ NOT DONE | Protocol tidak menerima parameter credentials |
| 28.4 booking.schema.ts snake_case mapping | N/A | Tidak ada file booking.schema.ts terpisah |

**Detail Task 28.1:**
```typescript
// booking-request.model.ts
export type NikCheck =
  | { status: "valid"; name: string }
  | { status: "not_found" }
  | { status: "inactive" }
  | { status: "used" };
```

---

### Task 30: Ticket module types [DONE] ✅

| Subtask | Status | Evidence |
|---------|--------|----------|
| 30.1 Ticket type dari GET /users/me/tickets | ✅ DONE | `ticket.model.ts` — `TicketSummary` type |
| 30.2 ETicket type dengan qrCode, qrValue, instructions | ✅ DONE | `ticket.model.ts` — `ETicket` type complete |
| 30.3 TicketProtocol dengan getMyTickets, getETicket | ✅ DONE | `ticket.protocol.ts` — both methods |
| 30.4 ticket.schema.ts untuk response parsing | ✅ DONE | `ticket.schema.ts` — myTicketsResponseSchema, eTicketSchema |

**Files:**
- `src/modules/ticket/domain/ticket.model.ts` — TicketSummary, ETicket, TicketStatus, MyTicketsResult
- `src/modules/ticket/domain/ticket.protocol.ts` — TicketProtocol interface
- `src/modules/ticket/data/ticket.schema.ts` — Zod schemas with snake_case → camelCase transform

---

### Task 31.3: SavedNik status field [NOT DONE]

| Status | Evidence |
|--------|----------|
| ❌ NOT DONE | `SavedNik` type tidak punya `status: 'VERIFIED'` field |

**Current SavedNik type** (`src/modules/auth/domain/account.model.ts`):
```typescript
export type SavedNik = {
  id: string;
  nikMasked: string;
  label: string;
  name: string | null;
  verifiedAt: string;  // Has verifiedAt, but no explicit status field
};
```

**Task requirement:** Tambah `status: 'VERIFIED'` field.

---

## Summary Table: Tasks Needing Status Update in tasks.md

| Task | Current Status | Should Be | Reason |
|------|---------------|-----------|--------|
| **19.7** | `[ ]` NOT DONE | `[x]` DONE | File `src/app/tickets/[ticketId]/page.tsx` exists |
| **23.1** | `[ ]` NOT DONE | `[x]` DONE | `e2e/happy-path.spec.ts` covers full happy path |
| **27.1** | `[ ]` NOT DONE | `[x]` DONE | `queueJoinSchema` includes `event: { id, name }` |
| **27.4** | `[ ]` NOT DONE | `[x]` DONE | Schema transforms snake_case to camelCase |
| **28.1** | `[ ]` NOT DONE | `[x]` DONE | `NikCheck` type has `name` and `status` fields |
| **30** | `[ ]` NOT DONE | `[x]` DONE | All ticket types and files complete |

---

## Recommendations

### Immediate Updates to tasks.md

1. **Mark as DONE:**
   - Task 19.7 — ticket page exists at `[ticketId]` route
   - Task 23.1 — happy path E2E test exists
   - Task 27.1 — QueueJoinResult has event info
   - Task 27.4 — snake_case mapping done in schema
   - Task 28.1 — NikValidationResult (NikCheck) complete
   - Task 30 (all subtasks) — Ticket module types complete

2. **Keep as NOT DONE but clarify:**
   - Task 16.5 — may not be needed if booking validateNik is sufficient (add note)
   - Task 16.6 — has unit tests but not property tests with fast-check
   - Task 20.4 — has functional tests but not fast-check property tests
   - Task 27.2, 27.3 — partial progress, model rename needed

### Implementation Priority

Untuk fitur yang benar-benar belum ada:
1. **Task 1** (Core CAPTCHA/system-health) — blocking untuk flow queue join
2. **Task 3.1** (join-queue-with-captcha use case) — depends on Task 1
3. **Task 25.3** (payment-reminder.mjml) — standalone email template
4. **Task 23.2, 23.3** (E2E queue pause, payment retry) — enhance test coverage

### Code Alignment Needed

1. **QueueState model** — rename `accessToken` → `grantToken` untuk konsistensi
2. **SavedNik type** — tambah `status: 'VERIFIED'` field jika API contract memerlukannya
3. **BookingResult type** — extend dengan `event`, `tickets[]` sesuai API contract

---

## Files Referenced

| Path | Purpose |
|------|---------|
| `src/modules/queue/domain/queue-state.model.ts` | QueueState type definition |
| `src/modules/queue/data/queue-state.schema.ts` | Queue API response schemas |
| `src/modules/queue/domain/queue.protocol.ts` | Queue protocol interface |
| `src/modules/booking/domain/booking-request.model.ts` | NikCheck, CreatedBooking types |
| `src/modules/booking/domain/booking.protocol.ts` | Booking protocol interface |
| `src/modules/ticket/domain/ticket.model.ts` | Ticket types |
| `src/modules/ticket/domain/ticket.protocol.ts` | Ticket protocol |
| `src/modules/ticket/data/ticket.schema.ts` | Ticket schemas |
| `src/modules/auth/domain/account.model.ts` | Account, SavedNik types |
| `src/modules/auth/domain/__tests__/account.rules.test.ts` | NIK validation tests |
| `src/core/i18n/__tests__/en.messages.test.ts` | i18n tests |
| `src/app/tickets/[ticketId]/page.tsx` | Ticket detail page |
| `e2e/happy-path.spec.ts` | E2E happy path tests |
| `e2e/booking.spec.ts` | E2E booking tests |
| `e2e/expiry-and-guards.spec.ts` | E2E expiry and guard tests |
| `emails/` | MJML email templates |
