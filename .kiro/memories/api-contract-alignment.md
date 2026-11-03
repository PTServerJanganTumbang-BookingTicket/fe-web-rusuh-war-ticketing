# Memory: API Contract Alignment v2.4

> Disimpan: 2024-11-03 | Referensi: `docs/api/api-contract.md`

## Overview

Mapping antara API contract dari backend (Apidog export) dengan spec files frontend. Dokumen ini menjadi acuan untuk implementasi.

## Reference Documents

| Dokumen | Path | Deskripsi |
|---------|------|-----------|
| API Contract | `docs/api/api-contract.md` | Canonical API contract dari Apidog |
| Design Appendix | `.kiro/specs/rusuh-tiket-booking/design.md` (Appendix A) | Type definitions alignment |
| Tasks Wave 0 | `.kiro/specs/rusuh-tiket-booking/tasks.md` (Task 26-31) | Pre-implementation alignment tasks |

## Authentication Schemes

| Scheme | Header/Cookie | Penggunaan |
|--------|---------------|------------|
| Bearer Token | `Authorization: Bearer {access_token}` | Sesi akun (login) |
| Grant Token | `X-Grant-Token: gt_...` | Slot booking (wajib untuk booking/payment) |
| Device ID | `X-Device-Id` | Pengikatan device untuk tamu (guest) |
| Queue Token (Web) | Cookie `queue_token` | Posisi antrian (HttpOnly) |
| Queue Token (Mobile) | `X-Queue-Token` | Posisi antrian untuk mobile |
| E-Ticket Token | Query `?t=...` | Akses e-ticket dari email |

## Key Naming Changes

| Sebelumnya | Sekarang | Konteks |
|------------|----------|---------|
| `accessToken` | `grantToken` | CustomerQueueState setelah GRANTED |
| `orderId` | `bookingId` | Semua payment endpoints |
| `NikFriend` | `SavedNik` | Auth module saved NIKs |
| `/me/nik-friends/*` | `/accounts/me/saved-niks` | Endpoint path |
| `/events/{id}/booking/session` | `/events/{event_id}/tickets` | Ticket selection page |
| `POST /orders/{id}/payment` | `POST /payments/{booking_id}` | Initiate payment |
| `DELETE /orders/{id}/payment` | `POST /payments/{booking_id}/retry` | Cancel & switch method |

## New Fields in Types

### QueueJoinResult
```typescript
// ADDED
event: { id: string; name: string }
```

### NikValidationResult
```typescript
// ADDED
name: string      // Nama dari Dukcapil
status: 'ACTIVE'  // Status NIK
```

### BookingResult
```typescript
// ADDED
event: { id, name, date, venue }
tickets: Array<{ category, price, nikMasked, holderName }> // holderName baru
summary: { subtotal, serviceFee, total }
```

### ETicket (New Type)
```typescript
qrCode: string       // data:image/png;base64,...
qrValue: string      // TKT-001|evt_konser_a|NIK
instructions: string // Instruksi masuk venue
```

## Response Wrapper Pattern

Semua API response menggunakan format:
```json
{
  "meta": { "code": 200, "message": "Success" },
  "data": { ... }
}
```

HttpClient harus:
1. Unwrap dan return hanya `data` ke domain
2. Handle error dari `meta.code` >= 400
3. Transform snake_case ke camelCase

## Implementation Priority

### Wave 0 (Pre-implementation) - Task 26-31
| Task | Owner | Deskripsi |
|------|-------|-----------|
| 26 | shared | HTTP client dengan auth headers |
| 27 | muzaki | Queue types alignment |
| 28 | muzaki | Booking types alignment |
| 29 | akbar | Payment types alignment |
| 30 | akbar | Ticket module types |
| 31 | muzaki | Auth saved-niks alignment |

### Already Complete
- Task 24: Catalog/Home module (done)

## Endpoint Reference

| Method | Path | Module | Auth |
|--------|------|--------|------|
| POST | `/auth/magic-link` | auth | - |
| GET | `/auth/verify` | auth | Cookie |
| POST | `/auth/register` | auth | - |
| POST | `/auth/refresh` | auth | Body |
| GET | `/accounts/me/saved-niks` | auth | Bearer |
| GET | `/events` | catalog | - |
| GET | `/events/{event_id}` | catalog | - |
| POST | `/events/{event_id}/queue/join` | queue | Cookie |
| GET | `/events/{event_id}/queue/stream` | queue | Cookie/X-Queue-Token |
| GET | `/events/{event_id}/queue/me` | queue | Cookie |
| GET | `/events/{event_id}/tickets` | booking | X-Grant-Token |
| POST | `/nik/validate` | booking | X-Grant-Token |
| POST | `/bookings` | booking | X-Grant-Token |
| GET | `/bookings/{booking_id}` | booking | X-Grant-Token |
| GET | `/payments/{booking_id}/methods` | payment | X-Grant-Token |
| POST | `/payments/{booking_id}` | payment | X-Grant-Token |
| POST | `/payments/{booking_id}/retry` | payment | X-Grant-Token |
| GET | `/payments/{booking_id}/status` | payment | X-Grant-Token |
| GET | `/users/me/tickets` | ticket | Bearer |
| GET | `/tickets/{ticket_id}/eticket` | ticket | Bearer/Query t |

---

*Last updated after API contract mapping session*
