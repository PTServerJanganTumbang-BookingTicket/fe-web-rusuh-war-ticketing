---
inclusion: auto
name: Naming Conventions
description: Konvensi penamaan file dan simbol TypeScript/React. Aktifkan saat membuat file baru atau me-rename.
---

# Naming Conventions

Konvensi penamaan file dan simbol. Referensi: `docs/ai/steering/coding-conventions.md`.

## Penamaan File

| Hal | File | Simbol |
|-----|------|--------|
| Model | `<konsep>.model.ts` | `Order` (PascalCase) |
| Rules | `<konsep>.rules.ts` | `canAddTicket` (camelCase) |
| Reducer | `<konsep>.reducer.ts` | `selectionReducer`, event `ADD_TICKET` |
| Constants | `<m>.constants.ts` | `MAX_TICKETS_PER_NIK` (SCREAMING_SNAKE) |
| Protocol | `<nama>.protocol.ts` | `OrderProtocol` (tanpa prefix `I`) |
| Use case | `<kata-kerja>-<benda>.use-case.ts` | `StartPaymentUseCase` |
| Service | `<teknologi>-<nama>.service.ts` | `HttpOrderService` |
| Schema | `<nama>.schema.ts` | `orderSchema` |
| Controller | `<m>.controller.ts` | `usePaymentController` |
| Mapper | `<m>.mapper.ts` | `toPaymentViewProps` |
| Query options | `<m>.queries.ts` | `queueKeys.position(eventId)` |
| Loader | `<layar>.loader.ts` | `loadHomeViewProps` |
| Hook bersama | `<nama>.hook.ts` | `useCountdown` |
| Container | `<Layar>Container.tsx` | `PaymentContainer` |
| View | `<Layar>View.tsx` | `PaymentView` |
| Module registry | `<m>.module.ts` | `paymentModule`, `PaymentRegistry` |
| Test | `<file>.test.ts(x)` | Di sebelah file yang ditest |
| Helper test | — | Awalan `setup`, bukan `use` |

## Aturan Umum

- **File non-komponen**: kebab-case dengan akhiran peran (`start-payment.use-case.ts`)
- **Komponen React**: PascalCase (`PaymentView.tsx`)
- **Folder modul**: camelCase, kata benda bounded context (`catalog`, `booking`, `payment`)

## Nama Registrasi Container

- Use case: `<x>UseCase` (`startPaymentUseCase`)
- Protocol: `<x>Service` (`orderService`)
- Sisanya: kata benda pendek (`clock`, `random`, `appConfig`, `httpClient`)

## Konstanta

- Format: `SCREAMING_SNAKE_CASE`
- Satuan di akhir: `_MS`, `_SECONDS` (`STOCK_REFRESH_INTERVAL_MS`)
- Setiap konstanta punya komentar rujukan requirement/ADR

## Key i18n

- Format: `feature.context.message` (`booking.quota.exceeded`)

## Flag Build

- Format: `NEXT_PUBLIC_<NAMA>` di `.env.example`

## Git Commit

- Conventional Commits: `feat(booking): ...`, `fix(queue): ...`
- Tipe: `feat fix docs style refactor perf test build ci chore revert`
- Subjek huruf kecil, imperatif, maksimal 72 karakter
- Body menjelaskan apa dan mengapa
- Tidak ada trailer atribusi atau co-authorship
