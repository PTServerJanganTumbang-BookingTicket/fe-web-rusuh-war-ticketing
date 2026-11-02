---
inclusion: auto
name: Architecture Layers
description: Aturan dependensi antar lapisan, struktur modul, dan dependency injection. Aktifkan saat menulis atau mengedit kode di src/modules atau src/core.
---

# Architecture Layers

Aturan dependensi antar lapisan untuk Clean Architecture. Referensi: `docs/ai/steering/architecture-rules.md`.

## Struktur Proyek

Satu aplikasi Next.js dengan modul fitur. **Bukan monorepo.**

```
src/app            → Next.js routing, layout, route handler (framework)
src/di             → Awilix composition root, config, AppProviders (wiring)
src/components/ui  → primitives, layout, tokens (design system)
src/modules/<m>/   → domain/ application/ data/ controllers/ views/ <m>.module.ts
src/core/          → domain/ application/ data/ controllers/ views/ i18n/ (shared logic)
src/mocks          → MSW
src/test           → test support
```

## Aturan Dependensi

Arah dependensi selalu **ke dalam**: `views → controllers → application (tipe saja) → domain`, `data → application → domain`.

| Lokasi | Boleh | Dilarang |
|--------|-------|----------|
| `domain/` | TypeScript murni, `core/domain` | React, Next, `zod`, `awilix`, `fetch`, `window`, `Date.now()` |
| `application/` | Use case, dependencies type, `domain`, `core/domain`, `core/application` | Framework, `zod`, `awilix`, `fetch`, `Date.now()`, `Math.random()` |
| `data/` | Service, schema zod, `core/data` | React, Next, `awilix`, `controllers`, `views` |
| `controllers/` | Controller, mapper, query options, `domain` (modul sendiri), `views` (tipe props), **`application` hanya `import type`** | Import nilai dari `application` atau `data`, `awilix`, `Date.now()` |
| `views/` (selain Container) | View props-only, `components/ui`, `domain` hanya tipe | Controller, i18n, hook data, TanStack Query |
| `components/ui/` | React, Radix UI, Tailwind | Semua di luar `components/` |

**Modul tidak saling mengimpor.** Kode bersama pindah ke `src/core`.

## Pola Wajib per Modul

```
src/modules/<m>/
├─ domain/
│  ├─ <konsep>.model.ts
│  ├─ <konsep>.rules.ts
│  ├─ <m>.constants.ts          # angka bisnis + rujukan ADR
│  └─ <nama>.protocol.ts
├─ application/
│  ├─ <kata-kerja>-<benda>.use-case.ts
│  └─ <m>.dependencies.ts
├─ data/
│  ├─ http-<nama>.service.ts
│  └─ <nama>.schema.ts
├─ controllers/
│  ├─ <m>.queries.ts
│  ├─ <m>.controller.ts
│  ├─ <m>.mapper.ts
│  └─ *.test.ts(x)
├─ views/
│  ├─ <Layar>Container.tsx
│  └─ <Layar>View.tsx
└─ <m>.module.ts
```

## Dependency Injection (Awilix)

- Mode: `InjectionMode.PROXY`, `strict: true`
- Constructor menerima satu objek: `constructor({ orderService }: { orderService: OrderProtocol })`
- `awilix` hanya diimpor dari `src/di` dan `*.module.ts`
- Controller: `const { getOrderUseCase } = useDependencies<PaymentDependencies>()`
- `process.env` hanya dibaca di `src/di/app-config.reader.ts`

## Import Path

- Impor di dalam satu modul memakai path **relatif**
- Impor ke `core`, `di`, `components`, atau dari `app` memakai alias `@/`
- UI primitives: `import { Button } from '@/components/ui/primitives'`
- Layout: `import { ScreenFrame } from '@/components/ui/layout/ScreenFrame'`

## Kelas vs Fungsi

**Kelas hanya untuk:**
- Client transport layer (`FetchHttpClient`, `EventSourceStreamClient`) — karena pola OOP dari library
- React error boundary

**Wajib fungsi (functional pattern):**
- Use case → factory: `createGetOrderUseCase({ deps }): UseCase`
- Service → factory: `createHttpOrderService({ deps }): Protocol`
- Komponen React (kecuali error boundary)
- Controller: `use<Layar>Controller` (custom hook)
- Mapper: `toXxxViewProps` (fungsi murni)
- Rules: `canAddTicket` (fungsi murni)
- Reducer: `(state, event) => state`
- Utils: `formatCurrency`

Lihat `coding-patterns.md` untuk contoh lengkap dan aturan DI (`asFunction` vs `asClass`).

## Functional Programming

- **Komponen fungsi saja (tanpa class)**. Pengecualian: error boundary
- Jika menemukan class component, **ubah ke functional component**
- Controller adalah hook (`use<Layar>Controller`), bukan class
- Mapper dan rules adalah fungsi murni
- Reducer memakai pattern `(state, event) => state`
- Hindari mutasi — kembalikan objek/array baru
- Pakai `useReducer` untuk state kompleks

## Jika Ragu

Kalau perubahan butuh melanggar aturan di atas, **berhenti dan usulkan ADR baru**.
