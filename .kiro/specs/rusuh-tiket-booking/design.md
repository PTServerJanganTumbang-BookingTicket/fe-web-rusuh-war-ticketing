# Design Document: Rusuh Tiket Booking Frontend

## Overview

Dokumen ini menjelaskan desain teknis frontend web **Rusuh Booking Tiket**, sebuah sistem pemesanan tiket konser yang dirancang untuk menangani 200.000–300.000 concurrent users saat flash crowd (lonjakan trafik ekstrem saat penjualan tiket dibuka).

> **Sumber kebenaran API**: [kontrak API v2.1](https://github.com/PTServerJanganTumbang-BookingTicket/documentations/blob/main/api/api-contracts.md) dan [OpenAPI](https://github.com/PTServerJanganTumbang-BookingTicket/documentations/blob/main/api/rusuh-booking-openapi.yaml) di repo `documentations`. Bila dokumen ini berbeda dengan kontrak, kontrak yang berlaku. Contoh tipe dan alur di dokumen ini ditulis sebelum kontrak diselaraskan, dan kode FE masih memakai bentuk lama sampai integrasi selesai. Login bersifat opsional, batas tiket mengikuti BR-01 (3 per transaksi) dan BR-02 (1 NIK per tiket), dan status pembayaran memakai polling.

### Tujuan Arsitektur

1. **Murah**: Tidak membangun framework internal. Memakai mekanisme React dan library yang sudah matang. Satu payment page untuk web dan mobile.
2. **Fungsional**: Setiap state alur (expired, stok berubah, pending, sesi diambil alih) dimodelkan eksplisit dan punya layar sendiri.
3. **Andal**: Logika kritis (kuota, timer, transisi state) adalah fungsi murni yang dites tanpa browser. Home statis dari CDN tetap hidup saat flash crowd. Timer server-authoritative.

### Keputusan Arsitektur Kunci

| Keputusan | Referensi | Ringkasan |
|-----------|-----------|-----------|
| Single app dengan feature modules | ADR-0013 | Bukan monorepo; satu aplikasi Next.js dengan folder per fitur |
| Clean Architecture per modul | ADR-0014 | 5 lapisan: domain, application, data, controllers, views |
| Dependency Injection Awilix | ADR-0015 | Composition root, PROXY mode, strict: true |
| SSE untuk antrian, polling untuk status pembayaran | ADR-0016, kontrak Appendix B | Antrian disiarkan ke banyak klien; status pembayaran milik satu klien |
| Server-authoritative time | ADR-0005 | Timer dari `expiresAt` server + offset, bukan countdown lokal |
| Payment via BE (Midtrans Core API) | ADR-0006 | FE tidak pernah memanggil Midtrans langsung |
| TanStack Query untuk server state | ADR-0004 | Cache, retry, polling dengan jitter |
| Payment instruction renderer | ADR-0022 | Composable renderer registry; `PaymentView` tidak tahu detail tiap metode |

---

## Architecture

### High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                    CLIENT (Browser)                                  │
├─────────────────────────────────────────────────────────────────────────────────────┤
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐        │
│  │   Home Page   │  │ Waiting Room  │  │ Detail Ticket │  │  Payment Page │        │
│  │    (ISR)      │  │    (SSE)      │  │   (Dynamic)   │  │   (Dynamic)   │        │
│  └───────┬───────┘  └───────┬───────┘  └───────┬───────┘  └───────┬───────┘        │
│          │                  │                  │                  │                 │
│          └──────────────────┴──────────────────┴──────────────────┘                 │
│                                      │                                              │
│  ┌───────────────────────────────────┴───────────────────────────────────┐         │
│  │                        TanStack Query Cache                            │         │
│  │                    (Shared cache, SSE writes here)                     │         │
│  └───────────────────────────────────────────────────────────────────────┘         │
│                                      │                                              │
│  ┌───────────────────────────────────┴───────────────────────────────────┐         │
│  │                      Awilix Container (DI)                             │         │
│  │         Use Cases ← Protocols ← Services ← HttpClient/SSE              │         │
│  └───────────────────────────────────────────────────────────────────────┘         │
└─────────────────────────────────────┬───────────────────────────────────────────────┘
                                      │ HTTPS
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              EDGE (CDN/Next.js Proxy)                                │
├─────────────────────────────────────────────────────────────────────────────────────┤
│  proxy.ts: JWT verification for /events/*/book and /orders/*/pay                    │
│  Static assets cached at CDN                                                         │
└─────────────────────────────────────┬───────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                  BACKEND SERVICES                                    │
├─────────────────────────────────────────────────────────────────────────────────────┤
│  Queue Service ─── Booking Service ─── Payment Service ─── Email Service            │
│       │                   │                   │                                      │
│       └───────────────────┴───────────────────┘                                      │
│                           │                                                          │
│               ┌───────────┴───────────┐                                              │
│               │   Midtrans Gateway    │                                              │
│               └───────────────────────┘                                              │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

### Module Structure

```
src/
├─ app/                     # Next.js App Router (routing, layouts, route handlers)
├─ proxy.ts                 # Edge middleware untuk validasi access token
├─ di/                      # Composition root Awilix
│  ├─ container.ts          # createAppContainer, AppRegistry
│  ├─ core.module.ts        # Registrasi shared dependencies
│  ├─ app-config.reader.ts  # Satu-satunya tempat baca process.env
│  ├─ server-dependencies.ts
│  └─ AppProviders.tsx      # TanStack Query + DI Context Provider
├─ components/ui/           # Design system (Signal DS)
│  ├─ primitives/           # Button, Badge, Card, Alert, Progress, RadioGroup
│  ├─ layout/               # ScreenFrame, CountdownCard, StatusView
│  └─ signal.css            # Token warna Signal
├─ modules/
│  ├─ auth/                 # Autentikasi & registrasi NIK
│  ├─ catalog/              # Daftar event (Home)
│  ├─ queue/                # Waiting Room (SSE)
│  ├─ booking/              # Detail Ticket (pemilihan tiket, NIK)
│  ├─ payment/              # Payment page (VA, GoPay); views/renderers/ via ADR-0022
│  └─ ticket/               # E-tiket (placeholder)
├─ core/                    # Shared logic, same layer structure
│  ├─ domain/               # AppError, protocols, time utils
│  ├─ application/          # Shared use cases
│  ├─ data/                 # HttpClient, SSE client
│  ├─ controllers/          # Shared hooks (useCountdown, useLiveUpdates)
│  ├─ views/                # ScreenLoading
│  └─ i18n/                 # Pesan ID/EN
├─ mocks/                   # MSW handlers
└─ test/                    # Test support
```

### Dependency Rules (ADR-0014)

```
views → controllers → application (type only) → domain
                                                    ↑
data ─────────────────────────────────────────────┘
```

| Layer | Allowed Imports | Forbidden |
|-------|-----------------|-----------|
| `domain/` | TypeScript murni, `core/domain` | React, Next, zod, awilix, fetch, Date.now() |
| `application/` | `domain`, `core/domain`, `core/application` | Framework, zod, awilix, fetch, Date.now() |
| `data/` | `domain`, `application`, `core/data` | React, Next, awilix, controllers, views |
| `controllers/` | `domain`, `views` (type), `application` (type only) | Import value dari application/data, Date.now() |
| `views/` | `components/ui`, `domain` (type only) | Controller, i18n, hook data |

---

## Components and Interfaces

### Module: auth

**Purpose**: Menangani autentikasi pengguna, registrasi akun, validasi NIK, dan consent management.

#### Domain Layer

```typescript
// auth/domain/user.model.ts
export type User = {
  id: string;
  email: string;
  maskedNik: string; // NIK tersamar "320***********001"
  emailVerified: boolean;
  consentGiven: boolean;
  consentTimestamp: string;
};

export type SavedNik = {
  id: string;
  nikMasked: string;    // "3171********22"
  label: string;        // Nama alias ("Budi")
  verifiedAt: string;   // ISO timestamp — always set (DB: CHECK verified_at IS NOT NULL)
  status: 'VERIFIED';   // Only verified entries are stored
};

// REMOVE NikFriend type — replaced by SavedNik above

export type NikValidationStatus = 
  | 'VALID' 
  | 'INVALID' 
  | 'PENDING_DUKCAPIL_VALIDATION';

export type MagicLinkContext = {
  type: string; // Contoh: "booking" (BR-09)
  eventId?: string;
  bookingId?: string;
};

export type LoginResult = {
  user: User;
  redirectContext?: MagicLinkContext;
};
```

```typescript
// auth/domain/auth.protocol.ts
// Login magic link sesuai kontrak API §1 (ADR-0023, Proposed). Login bersifat opsional.
export interface AuthProtocol {
  requestMagicLink(email: string): Promise<void>; // POST /auth/magic-link
  resendMagicLink(email: string): Promise<void>; // POST /auth/magic-link/resend
  verifyMagicLink(): Promise<LoginResult>; // GET /auth/verify, cara kirim token masih usulan di ADR-0023
  register(data: RegisterData): Promise<void>; // POST /auth/register
  getSavedNiks(): Promise<SavedNik[]>; // GET /accounts/me/saved-niks
  addSavedNik(nik: string, label: string): Promise<SavedNik>; // POST /accounts/me/saved-niks
  removeSavedNik(id: string): Promise<void>; // DELETE /accounts/me/saved-niks/{id}
}

export type AuthResult = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: User;
  redirectContext?: BookingRedirectContext; // BR-09: restore in-progress booking
};

export type BookingRedirectContext = {
  type: 'booking';
  eventId: string;
  bookingId?: string;
  message: string;
};

export type RegisterData = {
  email: string;
  nik: string;
  name: string;
  consent: { accepted: true; policyVersion: string }; // Wajib, checkbox tidak boleh pre-checked
};
```

```typescript
// auth/domain/nik-validation.rules.ts
export const NIK_LENGTH = 16;

export function isValidNikFormat(nik: string): boolean {
  return /^\d{16}$/.test(nik);
}

export function maskNik(nik: string): string {
  return nik.slice(0, 3) + '***********' + nik.slice(-3);
}
```

#### Application Layer

```typescript
// auth/application/validate-nik.use-case.ts
export type ValidateNikUseCase = (nik: string) => Promise<NikValidationResult>;

export function createValidateNikUseCase({ authService }: { authService: AuthProtocol }): ValidateNikUseCase {
  return async (nik) => {
    if (!isValidNikFormat(nik)) return { valid: false, reason: 'INVALID_FORMAT' };
    const status = await authService.validateNik(nik);
    return { valid: status === 'VALID', status };
  };
}
```

---

### Module: catalog

**Purpose**: Menampilkan daftar event di Home Page dengan status real-time.

#### Domain Layer

```typescript
// catalog/domain/event.model.ts
export type EventStatus = 'AVAILABLE' | 'SELLING_OUT_FAST' | 'SOLD_OUT';
export type QueueState = 'NOT_OPEN' | 'DIRECT' | 'OPEN' | 'FULL';

export type DisplayBlock = {
  enabled: boolean;
  action: 'queue' | 'book' | 'disabled';
  labelKey: string;
  badgeKey?: string;
};

export type Event = {
  id: string;
  name: string;
  date: string;
  venue: string;
  imageUrl: string;
  status: EventStatus;
  queueState: QueueState;
  display: DisplayBlock;
};
```

```typescript
// catalog/domain/event.constants.ts
// Ref: BR-20 — sold out bersifat sementara, final setelah 930 detik
/** Waktu sebelum sold out menjadi final (15.5 menit = 930 detik) */
export const SOLD_OUT_FINAL_TIMEOUT_SECONDS = 930;

// catalog/domain/sold-out.model.ts
export type SoldOutStatus = 
  | { type: 'temporary'; timeRemainingMs: number } // Masih bisa kembali dari expired booking
  | { type: 'final'; finalAt: string };            // Sudah final setelah 930 detik

export type SoldOutFinalEvent = {
  eventId: string;
  finalAt: string; // ISO timestamp
  reason: 'timeout_930s';
};
```

```typescript
// catalog/domain/event.protocol.ts
export interface EventProtocol {
  getEvents(): Promise<Event[]>;
  getEvent(eventId: string): Promise<Event>;
}
```

#### Controller Layer

```typescript
// catalog/controllers/home.controller.ts
export function useHomeController() {
  const { listEventsUseCase } = useDependencies<CatalogDependencies>();
  
  const eventsQuery = useQuery(eventsQueryOptions(listEventsUseCase));
  
  return {
    events: eventsQuery.data ?? [],
    isLoading: eventsQuery.isLoading,
    error: eventsQuery.error ? toAppError(eventsQuery.error) : null,
  };
}
```

---

### Module: queue

**Purpose**: Waiting Room dengan antrian virtual berbasis SSE.

#### Domain Layer

```typescript
// queue/domain/queue-state.model.ts
// Ref: claim-token endpoint REMOVED in v2.0 (ADR-005 Appendix C #1)
// Grant is now pushed via SSE 'grant' event; access_token fetched from GET /queue/me

export type WaitingRoomState =
  | {
      status: 'waiting';
      eventName: string;
      position: number;
      joinedPosition: number; // Initial position for progress bar
      etaSeconds: number;
      ratePerMin: number;
      paused: boolean;        // ❌ DIHAPUS (ADR-006 §4.3): field tetap ada untuk backward compat, selalu false
    }
  | {
      status: 'granted';      // 'grant' SSE event received; fetching access_token
      eventName: string;
    }
  | {
      status: 'admitted';
      eventName: string;
      accessToken: string;
      bookingExpiresAt: string;
      serverTime: string;
    }
  | {
      status: 'sold_out_temporary'; // state: SOLD_OUT on SSE — reversible, stay connected
      eventName: string;
      position: number;
    }
  | {
      status: 'sold_out_final';     // 'sold-out' SSE event — MUST close stream
      eventName: string;
    };
```

```typescript
// queue/domain/queue.protocol.ts
export interface QueueProtocol {
  joinQueue(eventId: string, captchaToken: string): Promise<QueueJoinResult>; // POST /events/{id}/queue/join
  getMyQueueState(eventId: string): Promise<CustomerQueueState>;              // GET /events/{id}/queue/me (re-entrancy)
  getNowServing(eventId: string): Promise<NowServingResult>;                  // GET /events/{id}/queue/serving (polling fallback)
  cancelQueue(eventId: string): Promise<void>;                               // implicit on leave
  // NOTE: claimToken REMOVED (ADR-005 v2.0) — grant pushed via SSE, access_token fetched from getMyQueueState
}

export type QueueJoinResult = {
  ticketNo: number;
  nowServing: number;
  position: number;
  estimatedWaitMinutes: number;
  sseUrl: string;
  rejoined?: boolean;
  state?: CustomerStateValue; // If rejoined and already past QUEUED
};

// State of THIS customer (from GET /queue/me)
export type CustomerStateValue = 'QUEUED' | 'GRANTED' | 'SELECTING' | 'AWAITING_PAYMENT' | 'CONFIRMED' | 'EXPIRED';

export type CustomerQueueState =
  | { state: 'QUEUED'; ticketNo: number; nowServing: number }
  | { state: 'GRANTED'; accessToken: string; bookingExpiresAt: string; serverTime: string }
  | { state: 'SELECTING'; accessToken: string; bookingId: string; bookingExpiresAt: string; serverTime: string }
  | { state: 'AWAITING_PAYMENT'; accessToken: string; bookingId: string; paymentExpiresAt: string; paymentRef: string; serverTime: string }
  | { state: 'CONFIRMED'; bookingId: string }
  | { state: 'EXPIRED' };

export type NowServingResult = {
  nowServing: number;
  ratePerMin: number;
  paused: boolean;
  serverTime: string;
  pollAfterMs: number; // Server-driven interval (10s/5s/2s/1s based on position)
};

// queue/domain/queue-updates.protocol.ts
// SSE stream: GET /events/{eventId}/queue/stream
// Auth: cookie queue_token (web) or Authorization header (mobile) — NEVER query string

export type QueueSsePayload = {
  nowServing: number;
  state: 'SCHEDULED' | 'OPEN' | 'SOLD_OUT' | 'CLOSED'; // Sale lifecycle
  ratePerMin: number;  // For ETA calculation (BR-11)
  paused: boolean;     // ❌ DIHAPUS (ADR-006 §4.3): selalu false, tidak ada pause admission
  serverTime: string;  // ISO-8601 — client syncs clock offset (BR-10)
};

// Event: grant (empty payload) — giliran customer tiba, access_token di GET /queue/me
export type GrantSseEvent = Record<never, never>;

// Event: status — data STALENESS indicator (NOT queue status, NOT connection status)
export type StatusSseEvent = {
  stale: boolean;
  reason: 'redis_disconnected' | 'no_admission_updates';
};

// Event: sold-out — sale permanently closed; client MUST call eventSource.close()
export type SoldOutSseEvent = { message: string };

export interface QueueUpdatesProtocol {
  subscribe(
    eventId: string,
    observer: Observer<QueueSsePayload>,
    onGrant: () => void,        // Fired on 'grant' event → call getMyQueueState
    onStalenessChange: (event: StatusSseEvent) => void,
    onSoldOut: () => void       // MUST call eventSource.close() here
  ): Unsubscribe;
}
```

```typescript
// queue/domain/queue-progress.rules.ts
export const ETA_BUFFER_MULTIPLIER = 1.2; // +20% buffer (BR-11)

export function calculatePosition(
  queueNumber: number, 
  nowServing: number
): number {
  return Math.max(0, queueNumber - nowServing);
}

export function calculateEta(
  position: number,
  avgProcessingRatePerMinute: number
): number {
  const baseEta = (position / avgProcessingRatePerMinute) * 60;
  return Math.ceil(baseEta * ETA_BUFFER_MULTIPLIER);
}
```

#### Application Layer

```typescript
// queue/application/watch-queue-state.use-case.ts
export type WatchQueueStateUseCase = (eventId: string, observer: Observer<QueueState>) => Unsubscribe;

export function createWatchQueueStateUseCase({
  queueUpdatesService,
}: {
  queueService: QueueProtocol;
  queueUpdatesService: QueueUpdatesProtocol;
}): WatchQueueStateUseCase {
  return (eventId, observer) =>
    queueUpdatesService.subscribe(eventId, (update) => {
      // Recalculate position based on nowServing
      observer.next(/* recalculated state */);
    });
}
```

```typescript
// queue/application/join-queue-with-captcha.use-case.ts
export type JoinQueueWithCaptchaUseCase = (eventId: string) => Promise<QueueJoinResult>;

export function createJoinQueueWithCaptchaUseCase({
  queueService,
  captchaService,
}: {
  queueService: QueueProtocol;
  captchaService: CaptchaProtocol;
}): JoinQueueWithCaptchaUseCase {
  return async (eventId) => {
    // Token prefetched before sale_starts_at (Req 3.22); refresh on failure
    const captchaToken = await captchaService.prefetchToken();
    return queueService.joinQueue(eventId, captchaToken);
  };
}
```

```typescript
// queue/application/get-customer-queue-state.use-case.ts
// Ref: BR-09 re-entrancy — GET /events/{id}/queue/me
// Called on: page load, SSE 'grant' event, when 'paused' changes on SSE payload
export type GetCustomerQueueStateUseCase = (eventId: string) => Promise<CustomerQueueState>;

export function createGetCustomerQueueStateUseCase({
  queueService,
}: {
  queueService: QueueProtocol;
}): GetCustomerQueueStateUseCase {
  return (eventId) => queueService.getMyQueueState(eventId);
}
```

---

### Module: booking

**Purpose**: Pemilihan tiket, validasi NIK per attendee, dan identitas pemesan.

#### Domain Layer

```typescript
// booking/domain/booking-session.model.ts
// Source: GET /events/{event_id}/tickets (replaces /events/{id}/booking/session)
export type TicketCategory = {
  id: string;
  name: string;
  description: string;
  priceIdr: number;
  available: number;         // 0 = habis
  maxPerOrder: number;       // 0 if sold out
};

export type BookingRules = {
  maxTicketsPerOrder: number; // 3 (BR-01)
  oneNikPerTicket: boolean;   // true (BR-02)
};

export type BookingSession = {
  event: {
    id: string;
    name: string;
    date: string;
    venue: string;
    imageUrl: string;
  };
  session: {
    expiresAt: string;   // Server timestamp (ADR-0005)
    ttlSeconds: number;  // Remaining seconds
    serverTime: string;  // For clock offset calculation
  };
  categories: TicketCategory[];
  rules: BookingRules;
};
```

```typescript
// booking/domain/attendee.model.ts
export type AttendeeInfo = {
  ticketIndex: number;
  categoryId: string;
  nik: string;
  holderEmail: string;         // Per-ticket email (FR-26: e-ticket delivered to each holder)
  nikSource: 'manual' | 'self' | 'saved'; // 'friend' renamed to 'saved' (saved-niks)
  nikValidationStatus: 'pending' | 'valid' | 'invalid' | 'already_used';
  // 'already_used' is INDICATIVE (not a reservation) — real enforcement is atomic at POST /bookings
};

export type BookingFormState = {
  attendees: AttendeeInfo[];
  contactEmail: string;       // Renamed from buyerEmail (matches API field: contact_email)
  emailValid: boolean;
};
```

```typescript
// booking/domain/booking.protocol.ts
export interface BookingProtocol {
  getSession(eventId: string): Promise<BookingSession>;          // GET /events/{id}/tickets
  validateNik(nik: string): Promise<NikValidationResult>;        // POST /nik/validate
  submitBooking(data: BookingSubmitData): Promise<BookingResult>; // POST /bookings
  getBooking(bookingId: string): Promise<BookingDetail>;         // GET /bookings/{id}
  // NOTE: separate stock endpoint REMOVED — stock comes with getSession and polling refetch
  // NOTE: quota endpoint REMOVED — quota enforced server-side atomically
}

export type NikValidationResult =
  | { valid: true; source: 'registered' | 'saved' | 'verified' }
  | { valid: true; alreadyUsed: true; reason: 'NIK_ALREADY_USED' }
  | { valid: false; reason: 'NIK_NOT_FOUND' | 'NIK_INACTIVE' | 'DUKCAPIL_UNAVAILABLE' };

// Fail-closed: DUKCAPIL_UNAVAILABLE blocks booking, not fallback (ADR-005 §8)

export type BookingSubmitData = {
  eventId: string;
  tickets: Array<{
    categoryId: string;
    nik: string;
    holderEmail: string; // Per-ticket (FR-26)
  }>;
  contactEmail: string;  // Overall contact
  termsVersion: string;
};

export type BookingResult = {
  bookingId: string;
  status: 'PENDING_PAYMENT';
  paymentTtl: { expiresAt: string; ttlSeconds: number; serverTime: string };
  redirectUrl: string;
};

export type BookingDetail = {
  bookingId: string;
  status: 'PENDING_PAYMENT' | 'PAID' | 'EXPIRED' | 'CANCELLED';
  event: { id: string; name: string; date: string; venue: string };
  tickets: Array<{ category: string; priceIdr: number; nikMasked: string; ticketId?: string; eticketUrl?: string }>;
  summary: { quantity: number; total: number };
  paymentTtl?: { expiresAt: string; ttlSeconds: number; serverTime: string };
  paidAt?: string;
  paymentMethod?: string;
};
```

```typescript
// booking/domain/booking.constants.ts
/** BR-01: maksimal tiket per transaksi */
export const MAX_TICKETS_PER_TRANSACTION = 3;

/** BR-03: TTL_Booking dalam detik */
export const TTL_BOOKING_SECONDS = 300; // 5 menit

/** Interval refresh stok (ADR-0004) */
export const STOCK_REFRESH_INTERVAL_MS = 15_000;

/** ❌ DIHAPUS (ADR-006 §4.3): BR-22 tidak berlaku lagi — tenggat tidak pernah digeser */
// export const PAUSE_TTL_GRACE_SECONDS = 60; // DEPRECATED
```

```typescript
// booking/domain/can-add-ticket.rules.ts
import { MAX_TICKETS_PER_TRANSACTION } from './booking.constants';

export function canAddTicket(
  currentCount: number,
  stock: number
): boolean {
  return currentCount < MAX_TICKETS_PER_TRANSACTION && stock > 0;
}

export function validateTicketSelection(
  selection: Map<string, number>,
  categories: TicketCategory[]
): ValidationResult {
  const totalTickets = Array.from(selection.values())
    .reduce((sum, qty) => sum + qty, 0);
    
  if (totalTickets > MAX_TICKETS_PER_TRANSACTION) {
    return { valid: false, error: 'EXCEEDS_MAX_TICKETS' };
  }
  
  for (const [categoryId, qty] of selection) {
    const category = categories.find(c => c.id === categoryId);
    if (!category || category.stock < qty) {
      return { valid: false, error: 'INSUFFICIENT_STOCK', categoryId };
    }
  }
  
  return { valid: true };
}
```

```typescript
// booking/domain/nik-dedup.rules.ts
export function findDuplicateNiks(niks: string[]): string[] {
  const seen = new Set<string>();
  const duplicates: string[] = [];
  
  for (const nik of niks) {
    if (seen.has(nik)) {
      duplicates.push(nik);
    }
    seen.add(nik);
  }
  
  return duplicates;
}

export function validateNikUniqueness(
  niks: string[]
): { valid: boolean; duplicates: string[] } {
  const duplicates = findDuplicateNiks(niks);
  return {
    valid: duplicates.length === 0,
    duplicates
  };
}
```

```typescript
// booking/domain/selection.reducer.ts
export type SelectionState = {
  quantities: Map<string, number>;
  totalTickets: number;
};

export type SelectionAction =
  | { type: 'INCREMENT'; categoryId: string }
  | { type: 'DECREMENT'; categoryId: string }
  | { type: 'SET'; categoryId: string; quantity: number }
  | { type: 'RESET' };

export function selectionReducer(
  state: SelectionState,
  action: SelectionAction
): SelectionState {
  // Pure reducer logic
}
```

#### Application Layer

```typescript
// booking/application/submit-booking.use-case.ts
export type SubmitBookingUseCase = (data: BookingSubmitData) => Promise<BookingResult>;

export function createSubmitBookingUseCase({ bookingService }: { bookingService: BookingProtocol }): SubmitBookingUseCase {
  return async (data) => {
    // Validasi NIK uniqueness (frontend validation)
    const nikValidation = validateNikUniqueness(data.attendees.map((a) => a.nik));

    if (!nikValidation.valid) {
      return {
        success: false,
        error: 'DUPLICATE_NIK_IN_REQUEST',
        duplicates: nikValidation.duplicates,
      };
    }

    // Submit to backend (atomic hold)
    return bookingService.submitBooking(data);
  };
}
```

---

### Module: payment

**Purpose**: Proses pembayaran dengan VA dan GoPay via Midtrans Core API.

#### Domain Layer

```typescript
// payment/domain/order.model.ts
// Source: POST /payments/{booking_id} response

export type PaymentMethod = 'bank_transfer' | 'gopay'; // bank_transfer = VA (BCA/BNI/BRI/CIMB)

export type BankCode = 'bca' | 'bni' | 'bri' | 'cimb';

export type PaymentInstruction =
  | { type: 'bank_transfer'; bank: BankCode; vaNumber: string }  // VA number only; expiry = payment TTL
  | { type: 'gopay'; qrUrl: string; deeplinkUrl: string };       // Desktop: qrUrl; mobile: deeplinkUrl

export type AvailableMethod = {
  id: PaymentMethod;
  name: string;
  description: string;
  iconUrl: string;
  enabled: boolean;                          // false when breaker OPEN
  banks?: Array<{ code: BankCode; name: string; iconUrl: string }>; // Only for bank_transfer
};

// Payment status from GET /payments/{id}/status polling
export type PaymentStatusResult =
  | { status: 'PENDING'; serverTime: string; ttlSeconds: number }
  | { status: 'PAID'; paidAt: string; redirectUrl: string }
  | { status: 'FAILED'; reason: string; canRetry: boolean; attempt: number; paymentExpiresAt: string; serverTime: string }
  | { status: 'EXPIRED'; expiredAt: string };

export type OrderStatus =
  | 'PENDING_PAYMENT'   // booking status: customer hasn't paid yet
  | 'AWAITING_PAYMENT'  // payment initiated, waiting gateway confirmation
  | 'PENDING_CANCELLATION' // TTL expired, grace period (show "verifying...")
  | 'PAID'
  | 'FAILED'
  | 'EXPIRED';

export type OrderItem = {
  category: string;
  priceIdr: number;
  nikMasked: string;
};

export type Order = {
  bookingId: string;
  eventName: string;
  items: OrderItem[];
  totalIdr: number;
  paymentTtl: { expiresAt: string; ttlSeconds: number; serverTime: string };
  status: OrderStatus;
  method?: PaymentMethod;
  instruction?: PaymentInstruction;
  attempt?: number;
};
```

```typescript
// payment/domain/payment.constants.ts
/** BR-05: TTL_Pembayaran dalam detik — starts from POST /bookings, not from page open */
export const TTL_PAYMENT_SECONDS = 600; // 10 menit

/** BR-10: Grace period dalam detik */
export const GRACE_PERIOD_SECONDS = 30;

/** Polling interval for payment status (no SSE for payment) */
export const PAYMENT_STATUS_POLL_INTERVAL_MS = 3_000;

/** Minimum remaining TTL to allow method switch (PAYMENT_WINDOW_CLOSED guard) */
export const MIN_RETRY_REMAINING_SECONDS = 60;
```

```typescript
// payment/domain/order.rules.ts
export function isFinalOrder(order: Order): boolean {
  return order.status === 'PAID' || order.status === 'FAILED' || order.status === 'EXPIRED';
}

// Ganti metode: cancel pending → POST /payments/{id}/retry → POST /payments/{id} with new method
// Can retry when booking is HELD with prior attempt (payment_status: FAILED from polling)
export function canRetryPayment(status: PaymentStatusResult['status']): boolean {
  return status === 'FAILED';
}

// Can initiate new payment when booking is HELD (before any attempt, or after deny/cancel)
export function canInitiatePayment(order: Order): boolean {
  return order.status === 'PENDING_PAYMENT';
}
```

```typescript
// payment/domain/order.protocol.ts
export interface OrderProtocol {
  getOrder(bookingId: string): Promise<Order>;                                   // GET /bookings/{id}
  getAvailableMethods(bookingId: string): Promise<AvailableMethod[]>;            // GET /payments/{id}/methods
  initiatePayment(bookingId: string, method: PaymentMethod, bank?: BankCode): Promise<Order>; // POST /payments/{id}
  retryPayment(bookingId: string): Promise<Order>;                               // POST /payments/{id}/retry (cancel & switch)
  getPaymentStatus(bookingId: string): Promise<PaymentStatusResult>;             // GET /payments/{id}/status
}

// NOTE: OrderUpdatesProtocol (SSE) REMOVED for payment
// Payment status uses polling only — audience is 1 person, not 300k (see Appendix B)
// NOTE: changePaymentMethod use case REMOVED — replaced by retryPayment flow:
//   1. Call retryPayment() → cancels pending transaction → booking returns to HELD
//   2. Call initiatePayment() with new method
```

```typescript
// payment/application/change-payment-method.use-case.ts REMOVED
// Replaced by retryPayment flow: retryPayment() → initiatePayment() with new method
```

#### Views Layer

Following ADR-0022 — Composable Instruction Renderer. `PaymentView` delegates rendering of each instruction type to a dedicated component via a registry. The controller and mapper never contain `switch`/`if` over `instruction.type`.

```typescript
// payment/views/renderers/renderer.registry.ts
import type { ComponentType } from "react";
import type { PaymentInstruction, PaymentMethod } from "../../domain/order.model";

export type InstructionRendererProps = {
  instruction: PaymentInstruction;
  copied: boolean;         // VA: has number been copied
  onCopy: (text: string) => void;
  isEmbedded: boolean;     // true when rendered inside WebView (ADR-0008)
};

export type InstructionRendererRegistry = {
  [K in PaymentMethod]: ComponentType<InstructionRendererProps>;
};

// Registry — adding a new payment method = one new file + one line here
export const instructionRenderers: InstructionRendererRegistry = {
  bank_transfer: BankTransferInstructionView,  // VA number + copy button (Signal DS)
  gopay: GoPayInstructionView,                  // QR (desktop) or deeplink (mobile/WebView)
};
```

**`isEmbedded` source**: set by `app/(embed)` layout — NEVER by `navigator.userAgent`. This ensures the WebView-specific render path is determined at the routing layer, not in component logic.

```typescript
// payment/views/PaymentView.tsx — delegate to registry, no switch
const InstructionRenderer = props.instruction
  ? instructionRenderers[props.instruction.type]
  : null;

return InstructionRenderer ? (
  <InstructionRenderer
    instruction={props.instruction}
    copied={props.copied}
    onCopy={props.onCopy}
    isEmbedded={props.isEmbedded}
  />
) : null;
```

File structure (ADR-0022):
```
payment/views/
├── PaymentView.tsx             ← orchestrator; no instruction.type branching
├── PaymentResultView.tsx
└── renderers/
    ├── renderer.registry.ts   ← InstructionRendererProps + registry
    ├── BankTransferInstructionView.tsx   ← Card + VA number + copy (Signal DS)
    └── GoPayInstructionView.tsx          ← QR url (desktop) | deeplink (mobile)
```

---

### Core Module

**Purpose**: Shared logic yang dipakai lintas modul.

#### Domain Layer

```typescript
// core/domain/app-error.ts
// Aligned with API Contracts Appendix A
export type ApiErrorCode =
  // NIK errors
  | 'NIK_ALREADY_USED'          // NIK sudah digunakan untuk event ini
  | 'NIK_NOT_FOUND'             // NIK tidak terdaftar di Dukcapil
  | 'NIK_INACTIVE'              // NIK terdaftar tapi status tidak aktif
  | 'NIK_VALIDATION_FAILED'     // Validasi NIK ke Dukcapil gagal
  | 'NIK_UNVERIFIED'            // NIK belum lolos POST /nik/validate
  | 'DUKCAPIL_UNAVAILABLE'      // Fail-closed: payment diblokir
  | 'NIK_ALREADY_REGISTERED'    // NIK sudah terikat ke akun lain (global)
  | 'NIK_ALREADY_SAVED'         // NIK sudah ada di saved-niks akun ini
  | 'MAX_SAVED_NIKS_REACHED'    // Saved-niks sudah 5 entri
  // Booking/stock errors
  | 'QTY_EXCEEDED'              // Melebihi 3 tiket per transaksi (BR-01)
  | 'QTY_INVALID'               // Jumlah tiket bukan ≥ 1
  | 'INSUFFICIENT_STOCK'        // Stok tidak mencukupi
  | 'STOCK_UNINITIALIZED'       // 503: kunci stok hilang dari Redis
  | 'STOCK_NEGATIVE'            // 503: guard terakhir menyala
  | 'TICKETS_UNAVAILABLE'       // Tiket sudah habis
  | 'BOOKING_EXPIRED'           // TTL booking habis
  | 'HOLD_EXPIRED'              // Hold sudah expired
  // Payment errors
  | 'PAYMENT_ALREADY_INITIATED' // Charge sudah berjalan; response lama diputar ulang
  | 'PAYMENT_ALREADY_SETTLED'   // Pembayaran lama sudah lunas saat cancel dicoba
  | 'PAYMENT_WINDOW_CLOSED'     // TTL habis atau sisa terlalu pendek untuk ganti metode
  | 'PAYMENT_EXPIRED'           // TTL pembayaran habis
  | 'MAX_ATTEMPTS_EXCEEDED'     // Batas percobaan pembayaran per booking
  | 'BANK_NOT_SUPPORTED'        // Bank di luar bca/bni/bri/cimb
  // Queue errors
  | 'QUEUE_FULL'                // Antrian mencapai kapasitas 300k
  | 'CAPTCHA_REQUIRED'          // captcha_token tidak disertakan
  | 'CAPTCHA_INVALID'           // Token CAPTCHA invalid/expired/used
  | 'ADMISSION_PAUSED'          // ❌ DIHAPUS (ADR-006 §4.3): tidak digunakan, antrian tetap maju
  // Auth errors
  | 'CONSENT_REQUIRED'          // Persetujuan PDP belum diberikan
  | 'TERMS_NOT_ACCEPTED'        // T&C belum diterima
  | 'TOKEN_EXPIRED'             // Access token expired
  | 'TOKEN_INVALID'             // Access token invalid
  | 'TOO_MANY_REQUESTS'         // Rate limited
  // Access errors
  | 'ACCESS_EXPIRED'            // Access token (queue slot) expired
  | 'SLOT_TAKEN_OVER';          // Retain for backward compat (maps to TOKEN_INVALID)

// REMOVED codes (map to above):
// QUOTA_EXCEEDED → QTY_EXCEEDED
// STOCK_INSUFFICIENT → INSUFFICIENT_STOCK
// QUEUE_TOKEN_INVALID → TOKEN_INVALID
// DUPLICATE_NIK_IN_REQUEST → frontend-only validation, no server code
// INVALID_NIK_FORMAT → 400 without specific code in API contracts
// PAYMENT_METHOD_CHANGE_NOT_ALLOWED → use retryPayment flow instead

export type AppError =
  | { kind: 'api'; code: ApiErrorCode; status: number }
  | { kind: 'network' }
  | { kind: 'invalid_response' }
  | { kind: 'unknown'; status?: number };

export class AppFailure extends Error {
  constructor(readonly error: AppError) {
    super(`AppFailure:${error.kind}`);
    this.name = 'AppFailure';
  }
}
```

```typescript
// core/domain/time/remaining-ms.utils.ts
export function remainingMs(
  expiresAt: string,
  clientNow: number,
  serverOffsetMs: number
): number {
  const expiresAtMs = new Date(expiresAt).getTime();
  const adjustedNow = clientNow + serverOffsetMs;
  return Math.max(0, expiresAtMs - adjustedNow);
}

export function computeServerOffset(
  serverNow: string,
  clientNow: number
): number {
  return new Date(serverNow).getTime() - clientNow;
}
```

```typescript
// core/domain/clock.protocol.ts
export interface ClockProtocol {
  now(): number;
}

// core/domain/random.protocol.ts
export interface RandomProtocol {
  random(): number;
}

// core/domain/captcha.protocol.ts
// Ref: Requirements 3.22, 12.4 — CAPTCHA tak terlihat dengan fail-open behavior
export interface CaptchaProtocol {
  prefetchToken(): Promise<string>;
  refreshToken(): Promise<string>;
  validateToken(token: string): Promise<CaptchaValidationResult>;
}

export type CaptchaValidationResult = {
  valid: boolean;
  score?: number;
  failedOpen?: boolean; // true if provider unavailable (fail-open behavior)
};

// core/domain/captcha.constants.ts
/** Prefetch CAPTCHA token 5 menit sebelum sale dibuka (Req 3.22) */
export const CAPTCHA_PREFETCH_BEFORE_SALE_MS = 300_000;

/** Interval refresh token CAPTCHA */
export const CAPTCHA_REFRESH_INTERVAL_MS = 60_000;

// core/domain/system-state.model.ts
// Ref: ❌ BR-21, BR-22 DIHAPUS (ADR-006 §4.3) — breaker OPEN = fail closed, antrian tetap maju
export type CircuitBreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export type SystemHealthState = {
  dukcapilAvailable: boolean;
  paymentGatewayAvailable: boolean;
  admissionPaused: boolean;
  pausedAt?: string; // ISO timestamp when pause started
  dukcapilCircuitBreaker: CircuitBreakerState;
  paymentCircuitBreaker: CircuitBreakerState;
};

// core/domain/system-health.protocol.ts
export interface SystemHealthProtocol {
  getHealthState(): Promise<SystemHealthState>;
}

// core/domain/system-health-updates.protocol.ts
export interface SystemHealthUpdatesProtocol {
  subscribe(observer: Observer<SystemHealthState>): Unsubscribe;
}
```

#### Data Layer

```typescript
// core/data/http/http-client.ts
export interface HttpClient {
  get<T>(path: string, schema: z.ZodType<T>): Promise<T>;
  post<T>(path: string, body: unknown, schema: z.ZodType<T>): Promise<T>;
  delete(path: string): Promise<void>;
}

// core/data/sse/event-stream-client.ts
export interface EventStreamClient {
  connect<T>(
    url: string,
    eventName: string,
    schema: z.ZodType<T>,
    observer: Observer<T>
  ): Unsubscribe;
}
```

#### Controllers Layer

```typescript
// core/controllers/countdown.hook.ts
export function useCountdown(expiresAt: string | null, serverNow: string | null) {
  const { clock } = useDependencies<CoreDependencies>();
  const [remaining, setRemaining] = useState<number | null>(null);
  
  useEffect(() => {
    if (!expiresAt || !serverNow) return;
    
    const offset = computeServerOffset(serverNow, clock.now());
    
    const tick = () => {
      setRemaining(remainingMs(expiresAt, clock.now(), offset));
    };
    
    tick();
    const intervalId = setInterval(tick, 1000);
    
    return () => clearInterval(intervalId);
  }, [expiresAt, serverNow, clock]);
  
  return remaining;
}
```

```typescript
// core/controllers/live-updates.hook.ts
export function useLiveUpdates<T>(
  key: QueryKey,
  subscribe: (observer: Observer<T>) => Unsubscribe,
  enabled: boolean
) {
  const queryClient = useQueryClient();
  const [live, setLive] = useState(false);
  
  useEffect(() => {
    if (!enabled) return;
    
    const unsubscribe = subscribe({
      next: (data) => {
        queryClient.setQueryData(key, data);
      },
      connected: () => setLive(true),
      disconnected: () => setLive(false),
    });
    
    return unsubscribe;
  }, [key, subscribe, enabled, queryClient]);
  
  return { live };
}
```

---

## Data Models

### API Request/Response DTOs

Bentuk request dan response ada di [kontrak API](https://github.com/PTServerJanganTumbang-BookingTicket/documentations/blob/main/api/api-contracts.md) dan [OpenAPI](https://github.com/PTServerJanganTumbang-BookingTicket/documentations/blob/main/api/rusuh-booking-openapi.yaml). Semua response memakai `{ meta: { code, message }, data }` dengan field `snake_case`. Tipe domain FE tetap `camelCase`, dan pemetaannya ada di schema zod `data/<nama>.schema.ts`.

```typescript
// Note: ALL API responses use {meta: {code, message}, data: ...} wrapper
// The HttpClient adapter handles unwrapping — domain models see only data payload

// Event List — GET /events
interface EventListResponse {
  events: Array<{
    id: string;
    name: string;
    date: string;
    imageUrl: string;
    status: 'AVAILABLE' | 'SELLING_OUT_FAST' | 'SOLD_OUT';
    queueState: 'NOT_OPEN' | 'DIRECT' | 'OPEN' | 'FULL';
    queueDepth: number;
    queueCapacity: number;      // 300000
    saleStartsAt: string;       // ISO-8601
    display: {
      enabled: boolean;
      action: 'JOIN_QUEUE' | 'GO_TO_TICKETS' | 'NONE';
      labelKey: string;         // i18n key (not text — FR-32 / multi-language)
      badgeKey: string | null;
    };
    minPrice: number | null;
    maxPrice: number | null;
  }>;
}

// Event Detail — GET /events/{id}
// Includes captcha.site_key for prefetching token before sale_starts_at
interface EventDetailResponse {
  // ... all EventListResponse fields +
  time: string;
  description: string;
  captcha: {
    provider: 'turnstile';
    siteKey: string; // Public key; used to load widget and prefetch token
  };
  ticketCategories: Array<{
    id: string;
    name: string;
    description: string;
    price: number;
    available: number;
    status: 'AVAILABLE' | 'SOLD_OUT';
  }>;
}

// Queue Join — POST /events/{id}/queue/join
interface QueueJoinRequest {
  captchaToken: string; // Required — prefetched before sale_starts_at
}

// Ticket Selection — GET /events/{id}/tickets (requires access_token)
interface TicketSelectionResponse {
  event: { id: string; name: string; date: string; venue: string; imageUrl: string };
  session: {
    expiresAt: string;    // Countdown anchor (ADR-0005, BR-03: from granted_at)
    ttlSeconds: number;   // Remaining
    serverTime: string;   // For clock offset
  };
  categories: Array<{
    id: string;
    name: string;
    description: string;
    price: number;
    available: number;
    maxPerOrder: number;
  }>;
  rules: { maxTicketsPerOrder: 3; oneNikPerTicket: true };
}

// NIK Validation — POST /nik/validate
interface NikValidateRequest { nik: string }
// Success response: {valid: true, source: 'registered'|'saved'|'verified'}
// Already used: {valid: true, alreadyUsed: true, reason: 'NIK_ALREADY_USED'}
// Invalid: {valid: false, reason: 'NIK_NOT_FOUND'|'NIK_INACTIVE'|'DUKCAPIL_UNAVAILABLE'}

// Submit Booking — POST /bookings
interface SubmitBookingRequest {
  eventId: string;
  tickets: Array<{
    categoryId: string;
    nik: string;
    holderEmail: string; // Per-ticket email for e-ticket delivery (FR-26)
  }>;
  contactEmail: string;  // Overall contact
  termsVersion: string;
}

// Payment Methods — GET /payments/{id}/methods
interface PaymentMethodsResponse {
  methods: Array<{
    id: 'bank_transfer' | 'gopay';
    name: string;
    enabled: boolean;
    banks?: Array<{ code: 'bca'|'bni'|'bri'|'cimb'; name: string; iconUrl: string }>;
  }>;
}

// Initiate Payment — POST /payments/{id}
interface InitiatePaymentRequest {
  method: 'bank_transfer' | 'gopay';
  bank?: 'bca' | 'bni' | 'bri' | 'cimb'; // Required for bank_transfer
}
// Response instructions:
// bank_transfer: { bank: 'bca', vaNumber: '8801234567890' }
// gopay: { qrUrl: string, deeplinkUrl: string }  (desktop: qrUrl; mobile: deeplinkUrl)

// Payment Status Poll — GET /payments/{id}/status
// status: 'PENDING' | 'PAID' | 'FAILED' | 'EXPIRED'
// PENDING_CANCELLATION maps to PENDING (show "verifying...", not expired screen)

// API Error Response (meta wrapper)
interface ApiErrorResponse {
  meta: { code: string; message: string };
  data: null;
}
```

### SSE Event Payloads

```typescript
// Queue SSE: GET /events/{eventId}/queue/stream
// Auth: Cookie queue_token (web) | Authorization header (mobile) — NEVER query string

// Default event (unnamed) — on nowServing change, paused change, or every 10s heartbeat
interface QueueDefaultSseEvent {
  nowServing: number;
  state: 'SCHEDULED' | 'OPEN' | 'SOLD_OUT' | 'CLOSED';
  ratePerMin: number;     // For ETA: P/R * 60 * 1.2 (BR-11)
  paused: boolean;        // ❌ DIHAPUS (ADR-006 §4.3): selalu false, tidak ada pause admission
  serverTime: string;     // BR-10: client syncs offset from this
}

// Event: 'grant' — customer's turn arrived; access_token NOT sent via SSE
// Client response: call GET /events/{id}/queue/me to get access_token
interface GrantSseEvent {} // empty payload

// Event: 'status' — DATA staleness indicator (NOT queue status, NOT connection status)
// Sent ONLY on transition; {stale: false} follows when data flows again
// Client MUST NOT reconnect on this — 300k simultaneous reconnects would cascade
interface StatusSseEvent {
  stale: boolean;
  reason: 'redis_disconnected' | 'no_admission_updates';
}

// Event: 'sold-out' — sale PERMANENTLY closed (state: CLOSED, after 930s)
// Client MUST call eventSource.close() — server rejects new connections with 410 Gone
// NOTE: state: SOLD_OUT is NOT this event — SOLD_OUT is reversible (booking expirations)
interface SoldOutSseEvent {
  message: string;
}

// Keepalive: `: keepalive` comment every 15s — NOT a named event, does not trigger handlers

// Payment status: polling only (GET /payments/{id}/status every 3s)
// NO SSE for payment — audience is 1 person, not 300k (see API contracts Appendix B)
```

---

## API Contracts

Daftar lengkap ada di [kontrak API](https://github.com/PTServerJanganTumbang-BookingTicket/documentations/blob/main/api/api-contracts.md). Peta FE saat ini ke kontrak:

| Area | FE saat ini | Kontrak |
|------|-------------|---------|
| Event | `GET /events` | `GET /events`, `GET /events/{event_id}` |
| Antrian | `GET /events/{id}/queue` | `POST …/queue/join`, `GET …/queue/me`, `GET …/queue/serving`, `GET …/queue/stream` |
| Booking | `GET /events/{id}/booking-session` | `GET /events/{event_id}/tickets`, `POST /nik/validate`, `POST /bookings`, `GET /bookings/{booking_id}` |
| Pembayaran | `GET /orders/{id}`, `POST /orders/{id}/payment`, `GET /orders/{id}/stream` | `GET /payments/{booking_id}/methods`, `POST /payments/{booking_id}`, `POST /payments/{booking_id}/retry`, `GET /payments/{booking_id}/status` |
| E-tiket | Belum ada | `GET /users/me/tickets`, `GET /tickets/{ticket_id}/eticket` |
| Akun | Belum ada | `/auth/*`, `/accounts/me/saved-niks` |

Endpoint di kontrak saat ini:

| Method | Path | Purpose | Auth | Module |
|--------|------|---------|------|--------|
| POST | `/auth/magic-link` | Request login link via email | - | auth |
| POST | `/auth/magic-link/resend` | Resend login link | - | auth |
| GET | `/auth/verify` | Verify magic link token → set session | Cookie | auth |
| POST | `/auth/register` | Register account (NIK + consent required) | - | auth |
| GET | `/accounts/me/saved-niks` | List saved NIKs (max 5) | Cookie | auth |
| POST | `/accounts/me/saved-niks` | Add NIK to saved list (Dukcapil called here) | Cookie | auth |
| DELETE | `/accounts/me/saved-niks/{id}` | Remove saved NIK | Cookie | auth |
| GET | `/events` | List all events | - | catalog |
| GET | `/events/{event_id}` | Event detail + captcha.site_key | - | catalog |
| POST | `/events/{event_id}/queue/join` | Join queue (captcha_token required) | Cookie | queue |
| GET | `/events/{event_id}/queue/me` | Re-entrancy: get current state + access_token | Cookie | queue |
| GET | `/events/{event_id}/queue/serving` | Now-serving + poll interval (fallback) | Cookie | queue |
| GET | `/events/{event_id}/tickets` | Ticket selection page (categories + session TTL) | AccessToken | booking |
| POST | `/nik/validate` | Validate NIK against Dukcapil (fail-closed) | AccessToken | booking |
| POST | `/bookings` | Submit booking → atomic hold all-or-nothing | AccessToken | booking |
| GET | `/bookings/{booking_id}` | Booking detail (PENDING_PAYMENT / PAID) | Cookie | booking |
| GET | `/payments/{booking_id}/methods` | Available payment methods | AccessToken | payment |
| POST | `/payments/{booking_id}` | Initiate payment (bank_transfer or gopay) | AccessToken | payment |
| POST | `/payments/{booking_id}/retry` | Cancel pending payment → switch method | AccessToken | payment |
| GET | `/payments/{booking_id}/status` | Poll payment status (3s interval) | AccessToken | payment |
| GET | `/users/me/tickets` | My tickets list | Cookie | ticket |
| GET | `/tickets/{ticket_id}/eticket` | E-ticket with QR code | Cookie | ticket |
| GET | `/admin/reconciliation/disputed` | Disputed payments for manual refund | AdminAuth | dashboard |
| GET | `/time` | Server time for clock sync | - | core |

Note: Removed endpoints vs design.md v1:
- `DELETE /events/{eventId}/queue` — cancel is implicit in join flow
- `GET /events/{eventId}/booking/stock` — stock comes with getSession, polled via refetch
- `POST /events/{eventId}/booking/validate-nik` → replaced by `POST /nik/validate`
- `POST /events/{eventId}/booking/submit` → replaced by `POST /bookings`
- `GET /api/quota/{nik}/{eventId}` — quota enforced server-side atomically
- `GET /orders/{orderId}` → replaced by `GET /bookings/{booking_id}`
- `POST /orders/{orderId}/payment` → replaced by `POST /payments/{booking_id}`
- `DELETE /orders/{orderId}/payment` → replaced by `POST /payments/{booking_id}/retry`
- `GET /me/nik-friends` etc → replaced by `/accounts/me/saved-niks`

Katalog error ada di Appendix A kontrak. Contoh response error di kontrak hanya memuat `meta.code` numerik dan `meta.message`, jadi FE belum punya field yang stabil untuk memetakan error ke layar. Ini perlu disepakati dengan BE sebelum integrasi.

---

## State Management

### TanStack Query Configuration

```typescript
// Query client configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0,
      gcTime: 5 * 60 * 1000, // 5 minutes
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: 0,
    },
  },
});
```

### Query Keys

```typescript
// catalog/controllers/catalog.queries.ts
export const catalogKeys = {
  all: ['catalog'] as const,
  events: () => [...catalogKeys.all, 'events'] as const,
  event: (eventId: string) => [...catalogKeys.all, 'event', eventId] as const,
};

// queue/controllers/queue.queries.ts
export const queueKeys = {
  all: ['queue'] as const,
  state: (eventId: string) => [...queueKeys.all, 'state', eventId] as const,
};

// booking/controllers/booking.queries.ts
export const bookingKeys = {
  all: ['booking'] as const,
  session: (eventId: string) => [...bookingKeys.all, 'session', eventId] as const,
  stock: (eventId: string) => [...bookingKeys.all, 'stock', eventId] as const,
  quota: (nik: string, eventId: string) => [...bookingKeys.all, 'quota', nik, eventId] as const,
};

// payment/controllers/payment.queries.ts
export const paymentKeys = {
  all: ['payment'] as const,
  order: (orderId: string) => [...paymentKeys.all, 'order', orderId] as const,
};

// core/controllers/system.queries.ts
// Ref: ❌ BR-21, BR-22 DIHAPUS (ADR-006 §4.3) — tidak ada pause admission
export const systemKeys = {
  all: ['system'] as const,
  health: () => [...systemKeys.all, 'health'] as const,
};
```

### Polling Configuration

| Query | Interval | Jitter | Condition |
|-------|----------|--------|-----------|
| Queue state | From server `retryAfterMs` | ±20% | SSE not connected |
| Claim slot (waiting_slot) | 1s | None | Position = 0, no slot available (Req 3 AC3a) |
| Stock refresh | 15s | ±20% | Always |
| Order status | 3s | ±20% | SSE not connected |
| System health | 10s | ±20% | SSE not connected |

### Local State (useReducer)

```typescript
// Ticket selection state
type SelectionState = {
  quantities: Map<string, number>;
  totalTickets: number;
};

// Booking form state
type BookingFormState = {
  attendees: AttendeeInfo[];
  buyerEmail: string;
  validation: ValidationState;
};

// UI state (modals, dialogs)
type UIState = {
  showCancelDialog: boolean;
  showExitDialog: boolean;
};
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: NIK Format Validation

*For any* input string, the system SHALL accept it as a valid NIK if and only if it consists of exactly 16 numeric digits.

**Validates: Requirements 0.2, 10.6, 10.7**

### Property 2: NIK Uniqueness Within Transaction

*For any* array of NIK entries in a booking form, if there exist two entries with the same NIK value, the form validation SHALL fail and identify all duplicate NIKs.

**Validates: Requirements 0.6, 4.6**

### Property 3: Ticket Count Equals NIK Form Count

*For any* ticket selection where N tickets are selected (1 ≤ N ≤ 3), the booking form SHALL render exactly N NIK input fields, one for each attendee.

**Validates: Requirements 0.5, 4.5**

### Property 4: Event Status to UI State Mapping

*For any* event with display block from server, the UI SHALL render the event as enabled if `display.enabled` is true, and disabled otherwise, without computing status precedence locally.

**Validates: Requirements 1.2, 1.3, 1.7**

### Property 5: Queue Position Display Format

*For any* queue state with position N where N > 0, the UI SHALL display "Anda antrian ke-{N}" exactly as calculated from `queueNumber - nowServing`.

**Validates: Requirements 3.1, 3.18**

### Property 6: Estimated Wait Time Buffer

*For any* average processing rate R and queue position P, the estimated wait time SHALL be at least P/R × 1.2 (20% buffer applied).

**Validates: Requirements 3.8, BR-11**

### Property 7: Category Disabled When Stock Zero

*For any* ticket category with stock equal to 0, the category selection UI SHALL be disabled and unclickable.

**Validates: Requirements 4.3, 4.12**

### Property 8: Total Ticket Limit Enforcement

*For any* ticket selection attempt that would result in more than 3 total tickets, the increment action SHALL be blocked and the submit button SHALL be disabled.

**Validates: Requirements 4.4, BR-01**

### Property 9: Email Format Validation

*For any* input string in the buyer email field, validation SHALL pass if and only if the string contains at least one `@` character followed by a domain with at least one `.` character.

**Validates: Requirements 4.13**

### Property 10: Server-Synced Countdown Calculation

*For any* server timestamp `expiresAt` and computed offset, the countdown displayed SHALL equal `max(0, expiresAt - (clientNow + offset))` in milliseconds, recalculated every tick.

**Validates: Requirements 5.1, 5.2, 5.3, 6.1**

### Property 11: Payment Instruction Type Mapping

*For any* payment instruction from server, the UI SHALL render the appropriate payment UI component based on instruction type: VA number for `virtual_account`, QR code for `qr`, deep link for `deeplink`.

**Validates: Requirements 6.3, 6.11**

### Property 12: Error Code to i18n Mapping

*For any* API error code returned by backend, the controller SHALL map it to a localized message key, and the view SHALL display the translated message in the current language.

**Validates: Requirements 4.16, 13.5**

### Property 13: Language Toggle Consistency

*For any* language selection (ID or EN), all UI text elements on the current page SHALL be rendered in the selected language without mixing.

**Validates: Requirements 13.2, 13.3**

### Property 14: ~~Pause TTL Grace Extension~~ ❌ DIHAPUS (ADR-006 §4.3)

~~*For any* booking or payment session with active TTL when system pause begins (circuit breaker OPEN), the TTL expiry SHALL be extended by exactly PAUSE_TTL_GRACE_SECONDS (60 seconds) from pause start time.~~

**Status: DIHAPUS** — Tenggat tidak pernah digeser. Breaker OPEN → fail closed dengan error yang dapat di-retry; antrian tetap maju.

~~**Validates: Requirements BR-21, BR-22**~~

### Property 15: CAPTCHA Token Prefetch Before Sale

*For any* event with sale start time T, the system SHALL prefetch CAPTCHA token at time T - CAPTCHA_PREFETCH_BEFORE_SALE_MS (5 minutes before), ensuring no interactive puzzle is required when joining queue.

**Validates: Requirements 3.22, 12.4**

### Property 16: Waiting Slot State Polling

*For any* queue state where position equals 0 and no slot is available, the system SHALL transition to 'waiting_slot' status and poll claim-token endpoint at exactly 1 second intervals until slot becomes available.

**Validates: Requirements 3.3a**

### Property 17: Sold Out Finality Timeout

*For any* event with SOLD_OUT status, the status SHALL remain temporary (allowing returns from expired bookings) for SOLD_OUT_FINAL_TIMEOUT_SECONDS (930 seconds), after which it becomes final.

**Validates: Requirements BR-20**

---

## Error Handling

### Error Flow

```
Backend Error → HttpClient → AppFailure → Use Case → Controller → Mapper → View
                   │                         │            │          │
                   └── Parse error code      │            │          │
                                             │            │          │
                                 Rethrow or return error  │          │
                                                          │          │
                                      Map AppError to i18n key       │
                                                                     │
                                                    Display localized message
```

### Error Handling Patterns

```typescript
// Controller error handling
export function useBookingController() {
  const mutation = useMutation({
    mutationFn: (data) => submitBookingUseCase.execute(data),
    onError: (error) => {
      const appError = toAppError(error);
      // Error is available in mutation.error
    },
  });
  
  return {
    error: mutation.error ? toAppError(mutation.error) : null,
    errorMessage: mutation.error 
      ? t(mapErrorToI18nKey(toAppError(mutation.error)))
      : null,
  };
}
```

```typescript
// Error to i18n key mapping
export function mapErrorToI18nKey(error: AppError): string {
  if (error.kind === 'api') {
    return `error.${error.code.toLowerCase()}`;
  }
  if (error.kind === 'network') {
    return 'error.network';
  }
  return 'error.unknown';
}
```

### Retry Strategies

| Error Type | Retry | Strategy |
|------------|-------|----------|
| Network error | Yes | Exponential backoff, max 3 times |
| 5xx errors | Yes | Exponential backoff, max 3 times |
| 4xx errors | No | Display error immediately |
| `DUKCAPIL_UNAVAILABLE` | No | Display error, offer retry button |

---

## Testing Strategy

### Test Pyramid

```
        ┌─────────┐
        │   E2E   │  Playwright - Critical user journeys
        │ (few)   │
        ├─────────┤
        │ Integ.  │  Controller tests with MSW
        │ (some)  │
        ├─────────┤
        │  Unit   │  Domain, rules, mappers, reducers
        │ (many)  │  Pure functions, no mocking
        └─────────┘
```

### Unit Testing (Pure Functions)

```typescript
// Domain rules - pure functions
describe('canAddTicket', () => {
  it('returns true when under limit and stock available', () => {
    expect(canAddTicket(2, 5)).toBe(true);
  });
  
  it('returns false when at limit', () => {
    expect(canAddTicket(3, 5)).toBe(false);
  });
  
  it('returns false when no stock', () => {
    expect(canAddTicket(1, 0)).toBe(false);
  });
});

// NIK validation - property-based
describe('NIK validation', () => {
  it.prop('accepts exactly 16 digits', [fc.string()])((input) => {
    const isValid = isValidNikFormat(input);
    const expected = /^\d{16}$/.test(input);
    expect(isValid).toBe(expected);
  });
});
```

### Integration Testing (Controller + MSW)

```typescript
// Controller tests with MSW handlers
describe('useBookingController', () => {
  it('submits booking and navigates to payment', async () => {
    server.use(
      http.post('/api/events/:eventId/booking/submit', () => {
        return HttpResponse.json({ orderId: 'order-123' });
      })
    );
    
    const { result } = renderHook(() => useBookingController(), {
      wrapper: createTestWrapper(),
    });
    
    await act(() => result.current.submitBooking(validData));
    
    expect(mockRouter.push).toHaveBeenCalledWith('/orders/order-123/pay');
  });
});
```

### E2E Testing (Playwright)

```typescript
// Critical user journey
test('complete booking flow', async ({ page }) => {
  // Start from home
  await page.goto('/');
  await page.click('[data-testid="event-card"]');
  
  // Wait in queue (mock instant admission)
  await expect(page).toHaveURL(/\/events\/.*\/book/);
  
  // Select tickets
  await page.click('[data-testid="category-increment"]');
  await page.fill('[data-testid="nik-input-0"]', '1234567890123456');
  await page.fill('[data-testid="email-input"]', 'test@example.com');
  await page.click('[data-testid="submit-booking"]');
  
  // Payment
  await expect(page).toHaveURL(/\/orders\/.*\/pay/);
  await page.click('[data-testid="method-va"]');
  await expect(page.locator('[data-testid="va-number"]')).toBeVisible();
});
```

### Test Coverage Requirements

| Layer | Target Coverage |
|-------|-----------------|
| `domain/` | 90% |
| `application/` | 85% |
| `data/` | 80% |
| `controllers/` | 80% |
| `src/di/` | 85% |

---

## Security Considerations

### Authentication & Authorization

1. **Cookie-based session**: `queue_token` dikelola BE. Token akun disimpan route same-origin di cookie HttpOnly, Secure, SameSite=Lax (ADR-0023)
2. **Access token validation at edge (proxy.ts)**: JWT signature verification
3. **Token tidak di URL**: SSE menggunakan cookie, bukan query param. Pengecualian: one-time code WebView (ADR-0008). Cara token magic link sampai ke verifikasi masih usulan (ADR-0023)
4. **Login opsional dan tanpa kata sandi**: magic link sesuai kontrak API §1 (ADR-0023)

### Input Validation

1. **NIK**: 16 digit numeric, validated client & server
2. **Email**: Format validation client-side, verification server-side
3. **XSS prevention**: React's default escaping, no `dangerouslySetInnerHTML`

### API Security

1. **CORS**: Strict origin validation
2. **Rate limiting**: Handled by backend
3. **CSRF**: Double-submit cookie pattern (if needed)

### Payment Security

1. **FE never calls Midtrans**: All payment via BE (ADR-0006)
2. **No sensitive data in FE**: VA numbers are display-only
3. **Status from server**: Ignore URL params, always query backend

### Data Protection

1. **NIK masking**: Display masked NIK in UI
2. **Minimal data retention**: No sensitive data in localStorage
3. **Consent tracking**: Record consent for NIK friend storage

---

## Performance Optimizations

### Rendering Strategy (ADR-0007)

| Page | Strategy | Reason |
|------|----------|--------|
| Home | Static/ISR (15s) | Survive flash crowd at CDN |
| Waiting Room | Static shell + Client | Shell from CDN, only SSE is dynamic |
| Detail Ticket | Dynamic | Requires access token |
| Payment | Dynamic | Requires valid session |

### Bundle Optimization

1. **Route-based code splitting**: Each page is its own chunk
2. **Tree shaking**: Dead code elimination
3. **No MSW in production**: Conditional import based on env

### Real-time Updates

1. **SSE over polling**: ~21× cheaper ($14 vs $300 per event)
2. **Single cache write**: SSE writes to TanStack Query cache
3. **Heartbeat**: Server sends `:` comment every 10s to keep connection

### Network Optimization

1. **Polling with jitter**: ±20% to avoid thundering herd
2. **Exponential backoff**: On error, prevent hammering server
3. **CDN for static assets**: Images, fonts, CSS

---

## Diagrams

### User Journey Flow

```mermaid
stateDiagram-v2
    [*] --> Home: Visit site
    Home --> WaitingRoom: Click available event
    Home --> Home: Event sold out (disabled)
    
    WaitingRoom --> WaitingRoom: Position > 0 (waiting)
    WaitingRoom --> WaitingSlot: Position = 0 (Req 3 AC3a)
    WaitingSlot --> DetailTicket: Slot available
    WaitingSlot --> WaitingSlot: No slot (polling 1s)
    WaitingRoom --> Home: Cancel queue
    WaitingRoom --> Home: TTL expired
    WaitingRoom --> WaitingRoom: Retry on error
    
    DetailTicket --> DetailTicket: Select tickets
    DetailTicket --> DetailTicket: Fill NIK & email
    DetailTicket --> Payment: Submit booking
    DetailTicket --> Home: TTL_Booking expired
    DetailTicket --> DetailTicket: Retry on error
    
    Payment --> Payment: Select method
    Payment --> Payment: Change method (Req 6 AC19)
    Payment --> Payment: Waiting confirmation
    Payment --> Success: Paid
    Payment --> Home: TTL_Payment expired
    Payment --> Home: Cancel payment
    Payment --> Payment: Retry on error
    
    Success --> [*]: E-ticket sent
```

### Booking State Machine (Frontend)

```mermaid
stateDiagram-v2
    [*] --> idle
    
    idle --> selecting: Load categories
    
    selecting --> selecting: Add/remove ticket
    selecting --> selecting: Fill NIK
    selecting --> validating: Submit
    selecting --> expired: TTL_Booking timeout
    
    validating --> submitting: Validation OK
    validating --> selecting: Validation error
    
    submitting --> held: Hold success
    submitting --> selecting: Hold failed (show error)
    
    held --> pending: Select payment method
    held --> expired: TTL_Payment timeout
    
    pending --> paid: Payment confirmed
    pending --> failed: Payment failed
    pending --> expired: TTL + Grace timeout
    
    paid --> [*]
    failed --> [*]
    expired --> [*]
```

### SSE Connection Flow

```mermaid
sequenceDiagram
    participant Client
    participant SSE Server
    participant TanStack Cache
    participant Backend
    
    Client->>SSE Server: Connect (cookie auth)
    SSE Server-->>Client: Snapshot (initial state)
    Client->>TanStack Cache: setQueryData
    
    loop While connected
        SSE Server-->>Client: Event (nowServing update)
        Client->>TanStack Cache: setQueryData
        Client->>Client: Recalculate position
    end
    
    alt Connection lost
        Client->>Client: Mark live=false
        Client->>Backend: Polling with jitter
        Backend-->>Client: State response
        Client->>TanStack Cache: setQueryData
    end
    
    SSE Server-->>Client: Close (status=admitted)
    Client->>Client: Redirect to Detail Ticket
```

---

## References

- [ADR-0013: Single app dengan feature modules](../../../docs/adr/0013-single-app-modular-structure.md)
- [ADR-0014: Clean Architecture per modul](../../../docs/adr/0014-modular-clean-architecture-solid.md)
- [ADR-0015: Dependency Injection Awilix](../../../docs/adr/0015-dependency-injection-awilix.md)
- [ADR-0016: SSE untuk real-time updates](../../../docs/adr/0016-realtime-updates-sse.md)
- [ADR-0005: Server-authoritative time](../../../docs/adr/0005-server-authoritative-time.md)
- [ADR-0006: Payment via Midtrans Core API](../../../docs/adr/0006-payment-midtrans-core-api.md)
- [ADR-0004: TanStack Query](../../../docs/adr/0004-server-state-tanstack-query.md)
- [ADR-0012: Signal DS](../../../docs/adr/0012-signal-ds-tokens-and-primitives.md)
- [ADR-0023: Login passwordless](../../../docs/adr/0023-passwordless-login-email.md)
- [Architecture Overview](../../../docs/architecture/overview.md)
- [ADR-0022: Payment UI — Composable Instruction Renderer](../../../docs/adr/0022-payment-instruction-renderer.md)

---

## Appendix A: API Contract Alignment (v2.4)

> **Reference**: `docs/api/api-contract.md` — canonical API contract dari Apidog export.

Bagian ini mendokumentasikan perubahan type definitions untuk alignment dengan API contract terbaru.

### A.1 Authentication Headers

API contract menggunakan multiple authentication schemes yang perlu diakomodasi di HttpClient:

```typescript
// core/data/http/http-client-config.ts
export type AuthHeaders = {
  // Cookie-based (auto-handled by browser)
  queueToken?: never; // HttpOnly cookie 'queue_token'
  
  // Header-based (manual)
  authorization?: string;     // Bearer {access_token} — sesi akun
  grantToken?: string;        // X-Grant-Token: gt_... — slot booking
  deviceId?: string;          // X-Device-Id — pengikatan device untuk tamu
  queueTokenHeader?: string;  // X-Queue-Token — mobile (no cookie)
};

// Protocol parameters yang membutuhkan headers:
export interface BookingProtocol {
  getSession(eventId: string, grantToken: string, deviceId?: string): Promise<BookingSession>;
  validateNik(nik: string, grantToken: string, deviceId?: string): Promise<NikValidationResult>;
  submitBooking(data: BookingSubmitData, grantToken: string, deviceId?: string): Promise<BookingResult>;
  getBooking(bookingId: string, grantToken: string, deviceId?: string): Promise<BookingDetail>;
}

export interface OrderProtocol {
  getAvailableMethods(bookingId: string, grantToken: string, deviceId?: string): Promise<AvailableMethod[]>;
  initiatePayment(bookingId: string, method: PaymentMethod, bank?: BankCode, grantToken: string, deviceId?: string): Promise<Order>;
  retryPayment(bookingId: string, grantToken: string, deviceId?: string): Promise<RetryPaymentResult>;
  getPaymentStatus(bookingId: string, grantToken: string, deviceId?: string): Promise<PaymentStatusResult>;
}
```

### A.2 Updated Type Definitions

#### QueueJoinResult — Tambah event info

```typescript
// queue/domain/queue.protocol.ts
export type QueueJoinResult = {
  ticketNo: number;
  nowServing: number;
  position: number;
  estimatedWaitMinutes: number;
  sseUrl: string;
  rejoined?: boolean;
  state?: CustomerStateValue;
  // NEW: Event info dari API contract
  event: {
    id: string;
    name: string;
  };
};
```

#### CustomerQueueState — Grant menggunakan grant_token, bukan access_token

```typescript
// queue/domain/queue.protocol.ts
export type CustomerQueueState =
  | { state: 'QUEUED'; ticketNo: number; nowServing: number }
  // CHANGED: grantToken instead of accessToken (API contract v2.4)
  | { state: 'GRANTED'; grantToken: string; bookingExpiresAt: string; serverTime: string }
  | { state: 'SELECTING'; grantToken: string; bookingId: string; bookingExpiresAt: string; serverTime: string }
  | { state: 'AWAITING_PAYMENT'; grantToken: string; bookingId: string; paymentExpiresAt: string; paymentRef: string; serverTime: string }
  | { state: 'CONFIRMED'; bookingId: string }
  | { state: 'EXPIRED' };
```

#### NikValidationResult — Tambah name dan status

```typescript
// booking/domain/booking.protocol.ts
export type NikValidationResult =
  | { 
      valid: true; 
      source: 'registered' | 'saved' | 'verified';
      name: string;     // NEW: Nama dari Dukcapil
      status: 'ACTIVE'; // NEW: Status NIK
    }
  | { valid: true; alreadyUsed: true; reason: 'NIK_ALREADY_USED' }
  | { valid: false; reason: 'NIK_NOT_FOUND' | 'NIK_INACTIVE' | 'DUKCAPIL_UNAVAILABLE' };
```

#### BookingResult — Tambah event, tickets dengan holder_name, summary

```typescript
// booking/domain/booking.protocol.ts
export type BookingResult = {
  bookingId: string;
  status: 'PENDING_PAYMENT';
  // NEW: Event info
  event: {
    id: string;
    name: string;
    date: string;
    venue: string;
  };
  // NEW: Ticket details with holder name
  tickets: Array<{
    category: string;
    price: number;
    nikMasked: string;
    holderName: string; // NEW: Nama dari Dukcapil saat validasi
  }>;
  // NEW: Summary
  summary: {
    subtotal: number;
    serviceFee: number;
    total: number;
  };
  paymentTtl: { expiresAt: string; ttlSeconds: number; serverTime: string };
  redirectUrl: string;
};
```

#### RetryPaymentResult — New type untuk cancel & switch

```typescript
// payment/domain/order.protocol.ts
export type RetryPaymentResult = {
  bookingId: string;
  status: 'HELD';
  attempt: number;
  cancelledOrderId: string;
  paymentExpiresAt: string;
  serverTime: string;
};
```

#### Ticket Module Types — E-ticket dengan QR

```typescript
// ticket/domain/ticket.model.ts
export type Ticket = {
  ticketId: string;
  bookingId: string;
  event: {
    id: string;
    name: string;
    date: string;
    venue: string;
    imageUrl: string;
  };
  category: string;
  price: number;
  status: 'VALID' | 'USED' | 'EXPIRED';
  eticketUrl: string;
};

export type ETicket = {
  ticketId: string;
  event: {
    name: string;
    date: string;
    time: string;
    venue: string;
  };
  category: string;
  holder: {
    nikMasked: string;
  };
  qrCode: string;       // data:image/png;base64,...
  qrValue: string;      // TKT-001|evt_konser_a|3171xxxxxxxxxx22
  instructions: string; // Tunjukkan QR code...
};

// ticket/domain/ticket.protocol.ts
export interface TicketProtocol {
  getMyTickets(status?: 'upcoming' | 'past' | 'all'): Promise<Ticket[]>;
  getETicket(ticketId: string, token?: string): Promise<ETicket>;
}
```

### A.3 API Endpoint Mapping

| Design.md Endpoint | API Contract Endpoint | Perubahan |
|--------------------|----------------------|-----------|
| `GET /events/{id}/booking/session` | `GET /events/{event_id}/tickets` | Path berubah |
| `POST /events/{id}/booking/validate-nik` | `POST /nik/validate` | Path berubah, X-Grant-Token wajib |
| `POST /events/{id}/booking/submit` | `POST /bookings` | Path berubah |
| `GET /orders/{orderId}` | `GET /bookings/{booking_id}` | Gunakan bookingId |
| `POST /orders/{orderId}/payment` | `POST /payments/{booking_id}` | Path berubah |
| `DELETE /orders/{orderId}/payment` | `POST /payments/{booking_id}/retry` | Method berubah, path berubah |
| `GET /me/nik-friends/*` | `GET /accounts/me/saved-niks` | Nama berubah: friends → saved-niks |
| — | `GET /tickets/{ticket_id}/eticket` | Endpoint baru |

### A.4 Response Schema Alignment

Semua response API menggunakan wrapper `{ meta: { code, message }, data: ... }`. HttpClient adapter harus:

1. Unwrap response dan return hanya `data` payload ke domain
2. Handle error dari `meta.code` yang bukan 2xx
3. Map snake_case ke camelCase (e.g., `holder_name` → `holderName`)

```typescript
// core/data/http/api-response.schema.ts
export const apiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    meta: z.object({
      code: z.number(),
      message: z.string(),
    }),
    data: dataSchema,
  });

// Transform di http-client.ts
const response = await fetch(url);
const json = await response.json();
const parsed = apiResponseSchema(dataSchema).parse(json);
if (parsed.meta.code >= 400) {
  throw new AppFailure({ kind: 'api', code: parsed.meta.message, status: parsed.meta.code });
}
return parsed.data;
```

---

