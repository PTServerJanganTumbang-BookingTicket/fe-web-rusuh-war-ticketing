# Memory: Common Code Patterns

> Reusable patterns yang sudah established di codebase

## Use Case Pattern
Location: src/modules/{module}/application/{action}.use-case.ts

## Protocol Pattern
Location: src/modules/{module}/domain/{entity}.protocol.ts

## Controller Pattern
Location: src/modules/{module}/controllers/{feature}.controller.ts
- Uses TanStack Query hooks
- Returns state and actions object

## Zod Schema Pattern
Location: src/modules/{module}/data/{entity}.schema.ts
- Use z.infer for type inference

## HTTP Service Pattern
Location: src/modules/{module}/data/http-{entity}.service.ts
- Implements protocol interface
- Uses HttpAdapter from infrastructure

## Query Keys Pattern
Location: src/modules/{module}/controllers/{module}.queries.ts
- Structure: all -> list -> detail(id)

## Signal UI Component Pattern
- variant="1" = primary/solid
- variant="2" = outline
- variant="3" = ghost/text
- Import from @signal-web-ui/react
