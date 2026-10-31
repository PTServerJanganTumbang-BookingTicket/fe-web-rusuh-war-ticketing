---
inclusion: auto
name: Commit Conventions
description: Aturan format commit message Conventional Commits. Aktifkan saat membuat commit.
---

# Commit Conventions

Aturan commit message mengikuti Telkomsel FOSS Technical Guidelines.

## Format Wajib

```
[JIRAID][ACTOR] <type>(<scope>): <short description>
```

| Bagian | Keterangan |
|--------|------------|
| `[JIRAID]` | Nomor tiket Jira (e.g. `TITAN-102`) |
| `[ACTOR]` | Nama developer |
| `type` | Tipe perubahan |
| `scope` | Area yang diubah |
| `short description` | Deskripsi singkat, imperatif |

## Contoh Valid

```
✓ [TITAN-102][Agus] feat(shop): add cart checkout flow
✓ [TITAN-305][Beta] fix(payment): resolve timeout on checkout
✓ [TITAN-410][Caca] chore(deps): update axios to v1.5.0
✓ [TITAN-500][Dodi] fix(auth): resolve critical login issue
✓ [SJT-001][Akbar] feat(booking): add ticket selection reducer
✓ [SJT-002][Akbar] fix(queue): handle SSE reconnection on network error
```

## Contoh INVALID

```
❌ feat(booking): add feature                    # tidak ada JIRAID dan ACTOR
❌ [Akbar] feat(booking): add feature            # tidak ada JIRAID
❌ [SJT-001] feat(booking): add feature          # tidak ada ACTOR
❌ update steering files                         # format salah total
❌ [SJT-001][Akbar] Add feature                  # tidak ada type dan scope
```

## Commit Types

| Type | Penggunaan |
|------|------------|
| `feat` | Fitur baru |
| `fix` | Bug fix |
| `chore` | Maintenance tasks |
| `docs` | Dokumentasi saja |
| `refactor` | Code refactoring tanpa mengubah behavior |
| `test` | Menambah atau memperbaiki test |

## Scope yang Umum Dipakai

- Modul: `booking`, `payment`, `queue`, `catalog`, `auth`
- Core: `core`, `di`
- Tooling: `deps`, `ci`, `kiro`
- Docs: `adr`, `readme`

## Git Branching Strategy

### Branch Types

| Branch | Fungsi |
|--------|--------|
| `main` | Single source of truth, protected, always releasable |
| `story/*` atau `feature/*` | Fitur baru |
| `fix/*` | Pre-production bug fix (branch dari `main`) |
| `chore/*` | Maintenance |
| `hotfix/*` | Urgent production fix (branch dari `release/*`, BUKAN `main`) |
| `release/X.Y.Z` | Release train |

### Key Principles

1. **Small, frequent commits** — multiple per day
2. **No long-lived feature branches** — lebih dari 1 hari harus di-merge
3. **Feature flags** untuk fitur yang belum selesai
4. **Automated mergeback** dari release branches

### Release Train Flow

1. Cut `release/X.Y.Z` dari `main`
2. Test: FT · NFT · Security
3. Tag, lalu mergeback ke `main`

### Hotfix Flow (SOP 3)

1. Branch `hotfix/*` dari `release/*`, **BUKAN** dari `main`
2. Merge, cut new tag (e.g. `9.4.1`)
3. Deploy, lalu mergeback ke `main`

### Mergeback Conflict Resolution

1. Cherry-pick MR ke `cherry-pick-*`
2. Merge `origin/release` locally
3. Resolve conflict, push, MR ke `main`

## CI/CD on Every Commit

Setiap commit otomatis menjalankan:
- ✅ Unit tests
- ✅ Code quality checks
- ✅ Security scans
- ✅ Auto-deploy to Dev

## Enforcement

- **Pre-commit hooks** — format dicek sebelum commit
- **CI/CD guardrails** — dicek ulang di pipeline

## Larangan

- **Jangan push langsung ke `main`** — branch protected
- **Jangan buat long-lived feature branch** (> 1 hari)
- **Jangan branch `hotfix/*` dari `main`** — harus dari `release/*`
- **Jangan `--force` push** tanpa konfirmasi
- **Jangan `--no-verify`** kecuali ada alasan eksplisit
