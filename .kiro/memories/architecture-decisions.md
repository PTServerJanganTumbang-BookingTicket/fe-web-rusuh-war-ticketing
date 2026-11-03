# Memory: Architecture Decisions Quick Reference

> Summary ADRs untuk quick lookup

## Active Decisions

| ADR | Title | Status | Key Points |
|-----|-------|--------|------------|
| ADR-0001 | Clean Architecture | Accepted | 5 layers: domain-application-data-controller-view |
| ADR-0002 | DI dengan Awilix | Accepted | Container-based dependency injection |
| ADR-0003 | SSE untuk Queue Updates | Accepted | Server-Sent Events, fallback polling |
| ADR-0004 | Server-Authoritative Timer | Accepted | expiresAt dari server + local offset |
| ADR-0005 | SSE vs Polling | Accepted | SSE chosen: 21x cheaper |
| ADR-0013 | Module Structure | Accepted | Feature-based modules di src/modules |
| ADR-0014 | State Management | Accepted | TanStack Query untuk server state |
| ADR-0015 | Form Management | Accepted | React Hook Form + Zod validation |

## Key Architectural Rules

### Layer Dependencies (MUST NOT violate)
presentation -> controllers -> application -> data -> domain
infrastructure provides cross-cutting concerns

### Module Boundaries
- Modules MUST NOT import from other modules directly
- Cross-module communication via protocols/interfaces only
- Shared code goes to src/core or src/infrastructure

### Timer Pattern (ADR-0004)
- CORRECT: remaining = expiresAt - serverTime - offset
- WRONG: remaining = expiresAt - Date.now()

### SSE Pattern (ADR-0003, ADR-0005)
- Primary: EventSource with cookie auth
- Fallback: Adaptive polling when SSE blocked
- Heartbeat: 10 second interval

## Full ADR Location
docs/adr/
