# ADR-0018: Trunk-Based Development dengan Release Train

- **Status**: Proposed
- **Tanggal**: 2026-10-30
- **Pengambil keputusan**: Tim FE Web
- **Requirement terkait**: NFR-08 (standar development), Telkomsel FOSS Technical Guidelines

## Konteks

Tim membutuhkan strategi Git branching yang:
- Mendukung CI/CD on every commit
- Memungkinkan release train dengan testing (FT, NFT, Security)
- Menyediakan jalur hotfix untuk production urgent
- Menjaga `main` selalu releasable

Telkomsel FOSS Technical Guidelines sudah mendefinisikan strategi Trunk-Based Development yang terbukti efektif untuk tim besar.

## Opsi yang dipertimbangkan

1. **GitFlow klasik** (`develop`, `release/*`, `hotfix/*`, `feature/*`). Banyak branch long-lived, merge conflict sering, dan `develop` sering tidak stabil.
2. **GitHub Flow** (hanya `main` + feature branch). Sederhana, tetapi tidak ada mekanisme release train dan testing pre-production.
3. **Trunk-Based Development dengan Release Train** (dipilih). `main` sebagai single source of truth, short-lived branch, dan release train untuk testing.

## Keputusan

Opsi 3, mengikuti Telkomsel FOSS Technical Guidelines.

### Branch Types

| Branch | Fungsi | Branch dari | Merge ke |
|--------|--------|-------------|----------|
| `main` | Single source of truth, protected, always releasable | — | — |
| `story/*` atau `feature/*` | Fitur baru | `main` | `main` |
| `fix/*` | Pre-production bug fix | `main` | `main` |
| `chore/*` | Maintenance (deps, config, docs) | `main` | `main` |
| `release/X.Y.Z` | Release train | `main` | Tag + mergeback ke `main` |
| `hotfix/*` | Urgent production fix | `release/*` | `release/*` + mergeback ke `main` |

### Key Principles

1. **Small, frequent commits** — multiple commits per day, bukan satu commit besar di akhir.
2. **No long-lived feature branches** — branch tidak boleh lebih dari 1 hari. Jika fitur besar, gunakan feature flag.
3. **Feature flags for incomplete features** — fitur yang belum selesai di-hide dengan flag, bukan di-hold di branch.
4. **Automated mergeback from release branches** — perubahan di release branch otomatis kembali ke `main`.

### Release Train Flow

```
main ──●────●────●────●────●────●────●────●── (always releasable)
       │              │                   ▲
       │    ┌─────────┘                   │
       │    │                             │
       │    ▼                             │
       │  release/1.0.0 ──[FT]──[NFT]──[Security]──[Tag]──┘
       │                                          │
       └──────────────────────────────────────────┘ (mergeback)
```

1. **Cut** `release/X.Y.Z` dari `main`
2. **Test**: Functional Test (FT) → Non-Functional Test (NFT) → Security Scan
3. **Tag** release, lalu **mergeback** ke `main`

### Hotfix Flow (SOP 3)

```
release/1.0.0 ──●────●────●
                     │    ▲
                     │    │
                     ▼    │
              hotfix/critical-fix ──●──┘
                                    │
                                    ▼
                              Tag 1.0.1, mergeback to main
```

1. Branch `hotfix/*` dari `release/*`, **BUKAN** dari `main`
2. Fix, merge ke `release/*`, cut new tag (e.g. `1.0.1`)
3. Deploy, lalu **mergeback** ke `main`

### Mergeback Conflict Resolution

Jika mergeback conflict:

1. Cherry-pick MR ke branch `cherry-pick-*`
2. Merge `origin/release` locally
3. Resolve conflict, push, MR ke `main`

### CI/CD on Every Commit

Setiap commit ke `main` dan branch aktif otomatis menjalankan:

- ✅ Unit tests (`npm test`)
- ✅ Code quality checks (`npm run lint`, `npm run typecheck`)
- ✅ Security scans
- ✅ Auto-deploy to Dev environment

### Commit Message Format

Mengikuti Conventional Commits dengan Jira ID dan Actor:

```
[JIRAID][ACTOR] <type>(<scope>): <short description>
```

Contoh:
```
[SJT-001][Akbar] feat(booking): add ticket selection reducer
[SJT-002][Zaki] fix(queue): handle SSE reconnection on network error
```

## Konsekuensi

- **Positif**: `main` selalu releasable, feedback loop cepat, integrasi conflict kecil karena branch short-lived, release train memungkinkan testing menyeluruh sebelum production.
- **Negatif**: membutuhkan disiplin commit kecil dan sering, feature flag infrastructure perlu disiapkan untuk fitur besar.
- **Yang harus dijaga**:
  - Branch `main` protected, tidak ada push langsung
  - CI/CD pipeline harus hijau sebelum merge
  - Hotfix selalu dari `release/*`, bukan `main`
  - Mergeback otomatis atau segera setelah release

## Referensi

- Telkomsel FOSS Technical Guidelines — Git Branching Strategy
- Telkomsel FOSS Technical Guidelines — Commit Message
