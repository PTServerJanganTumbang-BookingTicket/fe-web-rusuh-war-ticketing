# SJT Workflows

Workflow recipes untuk development project Rusuh Booking Tiket.

## Available Workflows

### `sjt-feature.workflow.yaml`

Workflow lengkap untuk implementasi satu requirement dengan 3 phases:

```
Plan → Implement → Review
```

**Usage:**
```
Launch sjt-feature workflow untuk R1: Event List
- requirement_id: R1
- jira_id: RUSUH-XXX
- actor: [Nama]
```

**Inputs:**
| Input | Required | Description |
|-------|----------|-------------|
| `requirement_id` | ✅ | ID requirement (R0, R1, R2, dst) |
| `jira_id` | ✅ | JIRA ticket untuk commit |
| `actor` | ✅ | Nama untuk commit message |

---

## Requirement Order (Recommended)

Urutan implementasi berdasarkan dependencies:

```
R1: Event List (Home Page)     ← Foundation, no dependencies
       ↓
R2: Routing (Queue vs Direct)  ← Depends on R1
       ↓
R3: Queue/Waiting Room         ← Depends on R2
       ↓
R0: Auth & NIK                 ← Gate sebelum Detail Ticket
       ↓
R4: Detail Ticket Page         ← Depends on R0, R3
       ↓
R5: Timer (Server-Authoritative)
       ↓
R6: Payment                    ← Final flow
```

## Agents Used

| Agent | Role | Expertise |
|-------|------|-----------|
| `sjt-planner` | Technical Architect | System design, DDD, 10+ years |
| `sjt-coder` | Software Engineer | TypeScript/React, TDD, 10+ years |
| `sjt-reviewer` | Staff Engineer | Code review, security, 10+ years |

## Output Locations

| Phase | Output |
|-------|--------|
| Plan | `.kiro/specs/rusuh-tiket-booking/plans/{req}-plan.md` |
| Review | `.kiro/specs/rusuh-tiket-booking/reviews/{req}-review.md` |

## Validation Checkpoints

Semua agents akan pause di checkpoints untuk minta validasi:

- **sjt-planner:** After investigation, after draft plan, on ambiguity
- **sjt-coder:** Before task, after task, on blocker, on unclear plan
- **sjt-reviewer:** Before review, on blocking issue, on requirement ambiguity, before verdict
