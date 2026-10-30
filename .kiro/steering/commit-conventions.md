---
inclusion: auto
name: Commit Conventions
description: Aturan format commit message Conventional Commits. Aktifkan saat membuat commit.
---

# Commit Conventions

Aturan commit message mengikuti Conventional Commits. Referensi: `docs/ai/steering/coding-conventions.md`.

## Format Wajib

```
<type>(<scope>): <subject>

[optional body]

[optional footer]
```

## Contoh Valid

```
feat(booking): add ticket selection reducer
fix(queue): handle SSE reconnection on network error
docs(adr): add ADR-0016 for SSE fallback strategy
chore(kiro): add steering files and hooks
refactor(payment): extract countdown logic to hook
test(booking): add unit tests for selection rules
```

## Contoh INVALID

```
❌ [akbar]: update steering          # format salah
❌ Update steering files             # tidak ada type
❌ feat: add feature                 # tidak ada scope
❌ FEAT(booking): Add feature        # huruf besar
❌ feat(booking): Add feature.       # huruf kapital, ada titik
```

## Type yang Diizinkan

| Type | Penggunaan |
|------|------------|
| `feat` | Fitur baru |
| `fix` | Bug fix |
| `docs` | Dokumentasi saja |
| `style` | Format kode (tidak mengubah logic) |
| `refactor` | Refactor tanpa mengubah behavior |
| `perf` | Peningkatan performa |
| `test` | Menambah atau memperbaiki test |
| `build` | Build system atau dependencies |
| `ci` | CI configuration |
| `chore` | Maintenance tasks |
| `revert` | Revert commit sebelumnya |

## Scope yang Umum Dipakai

- Modul: `booking`, `payment`, `queue`, `catalog`
- Core: `core`, `di`, `auth`
- Tooling: `kiro`, `eslint`, `ci`
- Docs: `adr`, `readme`

## Aturan Subject

- **Huruf kecil** di awal (bukan kapital)
- **Imperatif** ("add" bukan "added" atau "adds")
- **Maksimal 72 karakter** total (type + scope + subject)
- **Tanpa titik** di akhir

## Aturan Body (Opsional)

- Jelaskan **apa** dan **mengapa**, bukan *bagaimana*
- Pisahkan dari subject dengan baris kosong

## Larangan

- **Tidak ada trailer atribusi** (`Co-authored-by`, `Signed-off-by`)
- **Jangan `--no-verify`** kecuali ada alasan eksplisit
- **Jangan `--force` push** tanpa konfirmasi

## Sebelum Commit

Pastikan kode sudah:
1. ✅ Lolos `pnpm lint` tanpa warning
2. ✅ Lolos `pnpm typecheck`
3. ✅ Lolos `pnpm test` (untuk file terkait)
4. ✅ Format dengan Prettier
