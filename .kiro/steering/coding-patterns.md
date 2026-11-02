---
inclusion: auto
name: Coding Patterns
description: Pola penulisan kode wajib berbasis functional programming. Aktifkan saat menulis atau mengedit kode di src/modules atau src/core.
---

# Coding Patterns

Proyek ini menggunakan **functional programming** secara konsisten. Tidak ada class di lapisan `application`, `data`, atau `controllers`. Pengecualian satu-satunya adalah `.client.ts` di lapisan `data` (transport layer) dan error boundary React.

---

## Use Case — Factory Function Returning Function

Use case adalah **fungsi** yang menerima dependencies dan mengembalikan fungsi eksekutor.

### ✅ Benar
```typescript
// application/get-order.use-case.ts
import type { Order } from "../domain/order.model";
import type { OrderProtocol } from "../domain/order.protocol";

export type GetOrderUseCase = (orderId: string) => Promise<Order>;

export function createGetOrderUseCase({ orderService }: { orderService: OrderProtocol }): GetOrderUseCase {
  return (orderId) => orderService.get(orderId);
}
```

### ❌ Salah
```typescript
// DILARANG — jangan gunakan class
export class GetOrderUseCase {
  constructor(private deps: { orderService: OrderProtocol }) {}
  execute(orderId: string): Promise<Order> {
    return this.deps.orderService.get(orderId);
  }
}
```

### Aturan Use Case
- Nama factory: `create<KataKerja><Benda>UseCase`
- Nama type: `<KataKerja><Benda>UseCase` (type alias untuk signature fungsi)
- Dependencies melalui satu objek parameter: `{ dep1, dep2 }: { dep1: Protocol1; dep2: Protocol2 }`
- DI: `asFunction(createXxxUseCase).singleton()` — **bukan** `asClass`
- Dipanggil langsung: `useCase(args)` — **bukan** `useCase.execute(args)`

---

## Service — Factory Function Returning Object Literal

Service mengimplementasikan protocol dengan mengembalikan object literal.

### ✅ Benar
```typescript
// data/http-order.service.ts
import type { HttpClient } from "@/core/data/http/http.client";
import type { OrderProtocol } from "../domain/order.protocol";
import type { Order, PaymentMethod } from "../domain/order.model";
import { orderSchema } from "./order.schema";

export function createHttpOrderService({ httpClient }: { httpClient: HttpClient }): OrderProtocol {
  return {
    get(orderId: string): Promise<Order> {
      return httpClient.get(`/orders/${encodeURIComponent(orderId)}`, orderSchema);
    },
    initiatePayment(orderId: string, method: PaymentMethod): Promise<Order> {
      return httpClient.post(`/orders/${encodeURIComponent(orderId)}/payment`, { method }, orderSchema);
    },
  };
}
```

### ❌ Salah
```typescript
// DILARANG
export class HttpOrderService implements OrderProtocol {
  private readonly httpClient: HttpClient;
  constructor({ httpClient }: { httpClient: HttpClient }) {
    this.httpClient = httpClient;
  }
  get(orderId: string): Promise<Order> { ... }
}
```

### Aturan Service
- Nama factory: `create<Transport><Resource>Service`
- Return type adalah protocol/interface (bukan class): `): OrderProtocol {`
- DI: `asFunction(createXxxService).singleton()` — **bukan** `asClass`
- Service tanpa deps juga pakai factory: `export function createSystemClockService(): ClockProtocol { return { now: () => Date.now() }; }`

---

## Controller — Custom Hook

Controller adalah React hook yang mengekspos state dan handler ke view.

### ✅ Benar
```typescript
// controllers/payment.controller.ts
export function usePaymentController(): PaymentController {
  const { getOrderUseCase } = useDependencies<PaymentDependencies>();
  const [state, dispatch] = useReducer(reducer, initialState);

  const handlePay = useCallback(async () => {
    const order = await getOrderUseCase(state.orderId);
    dispatch({ type: "ORDER_LOADED", order });
  }, [getOrderUseCase, state.orderId]);

  return { state, onPay: handlePay };
}
```

### ❌ Salah
```typescript
// DILARANG
class PaymentController {
  execute() { ... }
}
```

### Aturan Controller
- Nama: `use<Layar>Controller` — wajib prefix `use`
- Mengembalikan objek dengan `state` + handler
- Dependencies diambil via `useDependencies<XxxDependencies>()`
- Controller **hanya** `import type` dari `application` — tidak pernah import nilai

---

## Mapper — Pure Function

Mapper adalah fungsi murni tanpa side effect, state, atau dependencies eksternal.

### ✅ Benar
```typescript
// controllers/payment.mapper.ts
export function toPaymentViewProps(input: PaymentViewInput): PaymentViewProps {
  return {
    title: t("payment.title"),
    total: { label: t("payment.total"), value: formatIdr(input.order.totalIdr) },
    // ...
  };
}
```

### Aturan Mapper
- Fungsi murni: input → output, tanpa side effect
- Tidak ada state, tidak ada `useXxx`, tidak ada async
- Nama: `to<TargetType>` atau `map<Source>To<Target>`

---

## Domain Rules — Pure Functions

Rules domain adalah fungsi murni tanpa framework, tanpa I/O.

### ✅ Benar
```typescript
// domain/can-add-ticket.rules.ts
export function canAddTicket(session: BookingSession, ticketId: string): boolean {
  const current = session.selections.find((s) => s.ticketId === ticketId);
  return (current?.quantity ?? 0) < session.maxPerTicket;
}
```

### Aturan Domain
- Tidak ada `React`, `fetch`, `Date.now()`, `Math.random()`, `zod`, `awilix`
- Tidak ada class — hanya fungsi dan tipe TypeScript
- Reducer pola `(state, event) => state`: state immutable, kembalikan objek baru

---

## Dependency Injection — asFunction

Semua registrasi use case dan service menggunakan `asFunction`, bukan `asClass`.

### ✅ Benar
```typescript
// payment.module.ts
import { asFunction, type NameAndRegistrationPair } from "awilix";
import { createHttpOrderService } from "./data/http-order.service";
import { createGetOrderUseCase } from "./application/get-order.use-case";

export function paymentModule(): NameAndRegistrationPair<PaymentRegistry> {
  return {
    orderService: asFunction(createHttpOrderService).singleton(),
    getOrderUseCase: asFunction(createGetOrderUseCase).singleton(),
  };
}
```

### ❌ Salah
```typescript
// DILARANG
import { asClass } from "awilix";
orderService: asClass(HttpOrderService).singleton(),
getOrderUseCase: asClass(GetOrderUseCase).singleton(),
```

### Pengecualian `asClass`
`asClass` hanya boleh untuk `.client.ts` di `core/data` yang merupakan transport layer:
- `FetchHttpClient` (`fetch-http.client.ts`)
- `EventSourceStreamClient` (`event-source-stream.client.ts`)

---

## Immutability

- **Jangan mutasi** object atau array — kembalikan yang baru
- Gunakan spread `{ ...obj, key: value }` atau `[...arr, item]`
- Reducer wajib immutable: `(state, event) => ({ ...state, field: newValue })`

### ✅ Benar
```typescript
function addTicket(state: SelectionState, ticketId: string): SelectionState {
  return {
    ...state,
    selections: [...state.selections, { ticketId, quantity: 1 }],
  };
}
```

### ❌ Salah
```typescript
function addTicket(state: SelectionState, ticketId: string): SelectionState {
  state.selections.push({ ticketId, quantity: 1 }); // DILARANG — mutasi
  return state;
}
```

---

## Ringkasan: Class vs Fungsi

| Layer | Pola | Contoh |
|-------|------|--------|
| `domain/` | Fungsi murni + tipe | `canAddTicket()`, `selectionReducer()` |
| `application/` | Factory → fungsi | `createGetOrderUseCase()` |
| `data/` | Factory → object literal | `createHttpOrderService()` |
| `controllers/` | Custom hook | `usePaymentController()` |
| `views/` | React component (fungsi) | `PaymentView` |
| `data/*.client.ts` | ⚠️ Class diizinkan | `FetchHttpClient`, `EventSourceStreamClient` |
| React error boundary | ⚠️ Class diizinkan | `ErrorBoundary` |

**Jika menemukan class di luar dua pengecualian di atas → refactor ke functional.**

---

## Referensi

- Architecture layers: lihat `architecture-layers.md`
- Pola yang dilarang: lihat `forbidden-patterns.md`
- ADR-0002: Layered Clean Architecture
- ADR-0013–0015: Awilix DI
