---
inclusion: auto
name: Git Workflow
description: Strategi branching Trunk-Based Development dan release train. Aktifkan saat membuat branch, merge, atau release.
---

# Git Workflow

Strategi Trunk-Based Development mengikuti Telkomsel FOSS Technical Guidelines. Referensi: [ADR-0018](../../docs/adr/0018-trunk-based-development.md).

## Branch Types

| Branch | Fungsi | Branch dari |
|--------|--------|-------------|
| `main` | Single source of truth, **protected**, always releasable | — |
| `story/*` atau `feature/*` | Fitur baru | `main` |
| `fix/*` | Pre-production bug fix | `main` |
| `chore/*` | Maintenance | `main` |
| `release/X.Y.Z` | Release train | `main` |
| `hotfix/*` | Urgent production fix | `release/*` ⚠️ |

## Key Principles

1. **Small, frequent commits** — multiple per day
2. **No long-lived branches** — maksimal 1 hari
3. **Feature flags** untuk fitur belum selesai
4. **Automated mergeback** dari release branches

## Workflow Harian

```bash
# 1. Buat branch dari main
git checkout main
git pull origin main
git checkout -b story/SJT-001-ticket-selection

# 2. Commit kecil dan sering
git add <files>
git commit -m "[SJT-001][Akbar] feat(booking): add ticket model"

# 3. Push dan buat MR sebelum 1 hari
git push -u origin story/SJT-001-ticket-selection
```

## Release Train Flow

```bash
# 1. Cut release dari main
git checkout main
git pull origin main
git checkout -b release/1.0.0

# 2. Testing: FT → NFT → Security
# (automated di CI/CD)

# 3. Tag dan mergeback
git tag v1.0.0
git push origin v1.0.0
git checkout main
git merge release/1.0.0
git push origin main
```

## Hotfix Flow (SOP 3)

⚠️ **Hotfix HARUS dari `release/*`, BUKAN dari `main`**

```bash
# 1. Branch dari release (BUKAN main!)
git checkout release/1.0.0
git checkout -b hotfix/critical-payment-fix

# 2. Fix dan commit
git commit -m "[SJT-999][Akbar] fix(payment): resolve critical timeout"

# 3. Merge ke release, tag baru
git checkout release/1.0.0
git merge hotfix/critical-payment-fix
git tag v1.0.1
git push origin v1.0.1

# 4. Mergeback ke main
git checkout main
git merge release/1.0.0
git push origin main
```

## Mergeback Conflict Resolution

```bash
# Jika conflict saat mergeback
git checkout -b cherry-pick-release-1.0.0
git merge origin/release/1.0.0
# Resolve conflicts
git add .
git commit -m "[SJT-XXX][Akbar] chore: resolve mergeback conflict"
git push origin cherry-pick-release-1.0.0
# Buat MR ke main
```

## CI/CD on Every Commit

Setiap commit otomatis menjalankan:
- ✅ `pnpm test` — Unit tests
- ✅ `pnpm lint` — Code quality
- ✅ `pnpm typecheck` — Type checking
- ✅ Security scans
- ✅ Auto-deploy to Dev

## Larangan

- ❌ **Jangan push langsung ke `main`** — branch protected
- ❌ **Jangan buat branch > 1 hari** — merge atau gunakan feature flag
- ❌ **Jangan hotfix dari `main`** — harus dari `release/*`
- ❌ **Jangan `--force` push** tanpa konfirmasi
- ❌ **Jangan `--no-verify`** tanpa alasan eksplisit
- ❌ **Jangan merge jika CI merah**

## Naming Convention

| Tipe | Format | Contoh |
|------|--------|--------|
| Feature | `story/<JIRAID>-<deskripsi>` | `story/SJT-001-ticket-selection` |
| Fix | `fix/<JIRAID>-<deskripsi>` | `fix/SJT-002-sse-reconnect` |
| Chore | `chore/<deskripsi>` | `chore/update-deps` |
| Release | `release/<X.Y.Z>` | `release/1.0.0` |
| Hotfix | `hotfix/<JIRAID>-<deskripsi>` | `hotfix/SJT-999-payment-timeout` |
