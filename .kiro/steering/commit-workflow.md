---
inclusion: auto
name: Commit Workflow
description: Prosedur lengkap untuk membuat commit. Aktifkan saat user meminta commit atau "jalankan commit".
---

# Commit Workflow

Prosedur standar untuk membuat commit di project ini.

## Kapan Diaktifkan

Aktifkan prosedur ini ketika user berkata:
- "Jalankan commit"
- "Commit"
- "Buat commit"
- "Push"

## Input yang Diperlukan

User HARUS memberikan:
1. **Jira ID** — Format: `SJT-XXX`, atau `NO-JIRA` jika tidak ada tiket
2. **Actor** — Nama developer (default: AKBAR jika tidak disebutkan)

Jika user tidak memberikan Jira ID, pakai `[NO-JIRA]`. Jangan mengarang nomor tiket.

## Prosedur Commit

### Step 1: Verifikasi Perubahan

```bash
# Lihat file yang berubah
git status

# Pastikan tidak ada error
npm run typecheck && npm run lint && npm test
```

### Step 2: Tentukan Commit Message

Format wajib:
```
[JIRAID][ACTOR] <type>(<scope>): <short description>
```

**Pilih type berdasarkan perubahan:**
| Type | Kapan Digunakan |
|------|-----------------|
| `feat` | Menambah fitur baru |
| `fix` | Memperbaiki bug |
| `refactor` | Mengubah kode tanpa ubah behavior |
| `chore` | Maintenance, update deps |
| `docs` | Dokumentasi saja |
| `test` | Menambah/memperbaiki test |

**Pilih scope berdasarkan area:**
- Modul: `booking`, `payment`, `queue`, `catalog`, `auth`
- Core: `core`, `di`
- Tooling: `deps`, `ci`, `kiro`

### Step 3: Stage dan Commit

```bash
# Stage specific files (jangan pakai git add . atau -A)
git add <file1> <file2> ...

# Commit dengan format yang benar
git commit -m "[SJT-XXX][Akbar] <type>(<scope>): <description>"
```

### Step 4: Konfirmasi Push

Sebelum push, TANYA user:
> "Commit berhasil dibuat. Apakah mau di-push ke origin?"

Jika user setuju:
```bash
git push origin <current-branch>
```

## Contoh Alur Lengkap

**User:** "Jalankan commit, Jira ID SJT-007, Actor AKBAR"

**Agent:**
1. Cek `git status` untuk lihat perubahan
2. Jalankan `npm run typecheck && npm run lint && npm test`
3. Tentukan type dan scope dari file yang berubah
4. Stage files yang relevan
5. Commit: `[SJT-007][Akbar] feat(payment): add payment timeout handler`
6. Tanya: "Commit berhasil. Mau di-push ke origin?"
7. Jika ya: `git push origin <branch>`

## Auto-Increment Jira ID

Hanya jika user secara eksplisit bilang "increment dari sebelumnya":
1. Cari commit terakhir: `git log --oneline -10`
2. Extract Jira ID tertinggi dari pattern `SJT-XXX`
3. Increment angkanya

**⚠️ PENTING: Selalu cek `git log` untuk mendapatkan tiket terakhir yang AKTUAL.**

Contoh:
- Jika commit terakhir `SJT-006` → commit berikutnya `SJT-007`
- Jika commit terakhir `SJT-010` → commit berikutnya `SJT-011`

**Jangan hardcode nomor tiket!** Selalu query dari git log.

## Larangan

- ❌ Jangan `git add .` atau `git add -A` — stage spesifik file saja
- ❌ Jangan push tanpa konfirmasi user
- ❌ Jangan `--force` push
- ❌ Jangan `--no-verify` kecuali ada alasan eksplisit
- ❌ Jangan commit jika test/lint/typecheck gagal

## Checklist Sebelum Commit

- [ ] `npm run typecheck` — tidak ada error
- [ ] `npm run lint` — tidak ada error
- [ ] `npm test` — semua test pass
- [ ] Format commit message sudah benar
- [ ] Hanya stage file yang relevan
