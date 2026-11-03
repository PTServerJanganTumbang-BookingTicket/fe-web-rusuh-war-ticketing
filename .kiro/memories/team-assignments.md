# Memory: Team Assignments

> Disimpan: 2024-11-03 | Sumber: tasks.md

## Team Members

| Name | GitHub | Modules |
|------|--------|---------|
| Akbar Hartomo | @akbhartomo | Payment, Ticket, Catalog/Home |
| Ahmad Muzaki | @muzaki | Core, Queue, Booking, Auth, Email |

## Task Ownership

### Akbar (@akbhartomo)
| Task | Description | Status |
|------|-------------|--------|
| 11-15 | Payment module alignment | To Do |
| 18 | Ticket module (new) | Done |
| 19.6-19.7 | Pay/Ticket route pages | To Do |
| 20.3 | Payment i18n keys | To Do |
| 23.3 | Payment retry E2E test | To Do |
| 24 | Catalog/Home module | Done |

### Muzaki (@muzaki)
| Task | Description | Status |
|------|-------------|--------|
| 1 | Core domain (CAPTCHA, health) | To Do |
| 2-5 | Queue module alignment | To Do |
| 6-10 | Booking module alignment | To Do |
| 16-17 | Auth module (new) | To Do |
| 19.1-19.5 | Queue/Auth/Book route pages | To Do |
| 20.1-20.2, 20.4 | Queue/Auth i18n, tests | To Do |
| 23.1-23.2 | Happy path, Queue pause E2E | To Do |
| 25 | HTML email templates | To Do |

### Shared
| Task | Description | Status |
|------|-------------|--------|
| 21 | MSW mock handlers | To Do |
| 22 | Full application checkpoint | To Do |

## Commit Actor Format

Actor names in commits should use **Capital Case**:
- ✅ `[SJT-021][Akbar] feat(ticket): ...`
- ✅ `[SJT-022][Muzaki] fix(queue): ...`
- ❌ `[SJT-021][akbar] feat(ticket): ...`

## Branch Naming Convention

- Feature: `feature/SJT-{XXX}-{short-desc}`
- Fix: `fix/SJT-{XXX}-{short-desc}`
- Chore: `chore/SJT-{XXX}-{short-desc}`
- Docs: `docs/SJT-{XXX}-{short-desc}`
