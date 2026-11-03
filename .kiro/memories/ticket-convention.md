# Memory: Ticket Convention

> SJT ticket tracking untuk commit messages

## Format
[SJT-XXX][Actor] type(scope): description

## Current Ticket Counter
Last used: SJT-023
Next available: SJT-024

## Ticket History

| Ticket | Actor | Type | Scope | Description |
|--------|-------|------|-------|-------------|
| SJT-013 | Akbar | refactor | payment | align domain, application, data layers to API v2.1 |
| SJT-014 | Akbar | chore | core | update imports formatting and refactor structure |
| SJT-015 | Akbar | chore | kiro | add task owners and update steering files |
| SJT-016 | Akbar | fix | deps | pin eslint-config-next to 16.4.2 |
| SJT-017 | Akbar | fix | payment | align controller, mapper, protocol to API v2.1 |
| SJT-018 | Akbar | fix | deps | remove @signal-web-ui/react and dead signal-provider |
| SJT-019 | Akbar | feat | catalog | redesign home page UI with navbar hero and footer |
| SJT-020 | Akbar | docs | kiro | add API contract alignment specs and memory |
| SJT-021 | Akbar | feat | ticket | add ticket module with my-tickets and e-ticket views |
| SJT-022 | Akbar | chore | kiro | add memories and workflows configuration |
| SJT-023 | Akbar | chore | kiro | add backlog update workflow and github project memory |

## Actors

| Actor | Full Name | GitHub |
|-------|-----------|--------|
| Akbar | Akbar Hartomo | @akbhartomo |
| Muzaki | Ahmad Muzaki | @muzaki |

## Scopes

| Scope | Module | Owner |
|-------|--------|-------|
| booking | Booking module | Muzaki |
| payment | Payment module | Akbar |
| queue | Queue module | Muzaki |
| catalog | Catalog/Home module | Akbar |
| auth | Auth module | Muzaki |
| ticket | Ticket module | Akbar |
| core | Core domain | Muzaki |
| di | Dependency injection | shared |
| deps | Dependencies | shared |
| ci | CI/CD | shared |
| kiro | Kiro config | shared |
| adr | ADR docs | shared |
| readme | Documentation | shared |

## Types

| Type | Usage |
|------|-------|
| feat | New feature |
| fix | Bug fix |
| chore | Maintenance |
| refactor | Code refactoring |
| test | Adding tests |
| docs | Documentation |
