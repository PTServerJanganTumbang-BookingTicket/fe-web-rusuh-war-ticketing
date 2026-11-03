# Memory: PR Body Template

> Template untuk Pull Request body agar konsisten dan informatif

## Standard PR Body Structure

```markdown
## Summary
[Deskripsi singkat 1-2 kalimat tentang apa yang PR ini lakukan]

## Changes

### [Category 1 - e.g., Domain Layer]
- `file1.ts` - Deskripsi perubahan
- `file2.ts` - Deskripsi perubahan

### [Category 2 - e.g., Application Layer]
- `file3.ts` - Deskripsi perubahan

### [Category 3 - e.g., Tests]
- `file.test.ts` - X tests added/updated

## Tasks Completed
- [x] Task N: Task title
  - N.1 Subtask description
  - N.2 Subtask description
  - ...

## Test Results
- ✅ Lint passed
- ✅ TypeCheck passed
- ✅ X tests passing

## Related
- Ticket: [SJT-XXX](link)
- Requirements: Req X.X, X.X
```

## Category Guidelines

| Layer | Category Name | Examples |
|-------|---------------|----------|
| Domain | Domain Layer | protocols, models, errors, constants |
| Application | Application Layer | use-cases |
| Data | Data Layer | services |
| Controller | Controller Layer | controllers |
| View | Presentation Layer | pages, components |
| Infra | Infrastructure | di, http, sse adapters |
| Config | Configuration | workflow, memory, steering files |
| Docs | Documentation | tasks.md, ADR, README |

## Task Completion Format

Extract from tasks.md:
```markdown
- [x] Task 11: Align payment module — domain layer
  - 11.1 payment.protocol.ts dengan StartPaymentParams
  - 11.2 payment.models.ts dengan PaymentMethod, BankCode enum
  - 11.3 payment.errors.ts dengan PaymentExpiredError
```

## Test Results Section

Selalu include hasil verifikasi:
```markdown
## Test Results
- ✅ Lint: `npm run lint` passed
- ✅ TypeCheck: `npm run typecheck` passed
- ✅ Tests: X tests passing in Y files
```

Jika ada failure:
```markdown
## Test Results
- ✅ Lint: passed
- ⚠️ TypeCheck: X warnings (tidak blocking)
- ✅ Tests: X tests passing
```

## Usage in Workflow

Ketika create/update PR, gunakan template ini:
1. Summary: Ambil dari task title di tasks.md
2. Changes: Group berdasarkan layer (domain/app/data/controller/view)
3. Tasks Completed: Copy dari tasks.md dengan checkbox
4. Test Results: Dari output verification step

## Example - Single Task PR

```markdown
## Summary
Align payment module domain layer dengan API contract v2.1, menambahkan support untuk multiple payment methods dan bank codes.

## Changes

### Domain Layer
- `payment.protocol.ts` - Add StartPaymentParams dengan BankCode
- `payment.models.ts` - Add PaymentMethod, BankCode enum
- `payment.errors.ts` - Add PaymentExpiredError
- `payment.constants.ts` - Add TTL constants

### Tests
- `payment.models.test.ts` - 5 property tests untuk validation

## Tasks Completed
- [x] Task 11: Align payment module — domain layer
  - 11.1 payment.protocol.ts dengan StartPaymentParams
  - 11.2 payment.models.ts dengan PaymentMethod, BankCode enum
  - 11.3 payment.errors.ts dengan PaymentExpiredError
  - 11.4 index.ts exports
  - 11.5 payment.constants.ts dengan TTL constants

## Test Results
- ✅ Lint passed
- ✅ TypeCheck passed
- ✅ 5 tests passing

## Related
- Ticket: SJT-024
- Requirements: Req 6.1, 6.7, 6.13, BR-05
```

## Example - Multi-Task PR

```markdown
## Summary
Align payment module domain dan application layers dengan API contract v2.1.

## Changes

### Domain Layer (Task 11)
- `payment.protocol.ts` - Add StartPaymentParams
- `payment.models.ts` - Add enums
- `payment.errors.ts` - Add errors
- `payment.constants.ts` - Add constants

### Application Layer (Task 12)
- `watch-order.use-case.ts` - Rewrite to polling-based
- `get-order.use-case.ts` - Rename orderId → bookingId
- `start-payment.use-case.ts` - Add BankCode param
- `get-available-methods.use-case.ts` - [NEW]
- `retry-payment.use-case.ts` - [NEW]

### Tests
- `payment.use-cases.test.ts` - 7 tests for all use cases

## Tasks Completed
- [x] Task 11: Align payment module — domain layer
  - 11.1 - 11.5 subtasks
- [x] Task 12: Align payment module — application layer
  - 12.1 - 12.6 subtasks

## Test Results
- ✅ Lint passed
- ✅ TypeCheck passed
- ✅ 12 tests passing
```
