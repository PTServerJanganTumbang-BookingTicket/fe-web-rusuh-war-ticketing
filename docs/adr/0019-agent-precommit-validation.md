# ADR-0019: Agent Pre-Commit Validation Hook

- **Status**: Accepted
- **Tanggal**: 2026-10-26
- **Pengambil keputusan**: Tim FE Web
- **Requirement terkait**: NFR-08 (standar development), ADR-0018 (Trunk-Based Development)

## Konteks

Proyek ini menggunakan AI agent (Kiro) untuk membantu development. Agent dapat melakukan commit atas nama developer, namun commit message harus tetap mengikuti format yang ditetapkan di ADR-0018:

```
[JIRAID][ACTOR] <type>(<scope>): <short description>
```

Tanpa validasi, agent bisa membuat commit dengan format yang salah atau tanpa JIRAID yang valid. Perlu mekanisme untuk memastikan setiap commit yang dibuat oleh agent memenuhi konvensi tim.

**Pertimbangan penting:**
- Agent tidak tahu tiket Jira mana yang sedang dikerjakan kecuali diberitahu
- Auto-push tanpa review berbahaya karena menghilangkan kesempatan developer memeriksa perubahan
- Conflict resolution otomatis berisiko menghapus kode penting
- Full git workflow (fetch → resolve → commit → push) terlalu kompleks untuk hook

## Opsi yang dipertimbangkan

1. **Full git workflow hook** (fetch → resolve conflict → commit → push). Terlalu kompleks, conflict resolution butuh judgment manusia, auto-push berbahaya.

2. **Commitlint + Husky di level git**. Robust karena berjalan di level git native, tapi tidak bisa meminta input interaktif dari agent jika format salah.

3. **Agent pre-commit validation hook** (dipilih). Hook ringan di Kiro yang memvalidasi format sebelum commit dan meminta JIRAID jika tidak ada.

## Keputusan

Opsi 3: Implementasi **agent pre-commit validation hook** dengan scope terbatas:

### Yang dilakukan hook:
- Validasi format commit message sesuai konvensi `[JIRAID][ACTOR] <type>(<scope>): <description>`
- Meminta JIRAID dari user jika tidak disediakan
- Memblokir commit jika format tidak valid

### Yang TIDAK dilakukan hook:
- ❌ Auto-fetch repository
- ❌ Auto-resolve conflict (butuh judgment manusia)
- ❌ Auto-push ke remote (butuh review manual)
- ❌ Auto-merge branches

### Implementasi

Hook file: `.kiro/hooks/commit-msg-guard.json`

```json
{
  "version": "v1",
  "hooks": [{
    "name": "Commit Message Guard",
    "trigger": "PreToolUse",
    "matcher": "execute_bash",
    "action": {
      "type": "agent",
      "prompt": "If the command contains 'git commit', verify the commit message follows the required format: [JIRAID][ACTOR] <type>(<scope>): <description>. JIRAID must be a valid Jira ticket (e.g., SJT-001, TITAN-102). If JIRAID is missing or invalid, ask the user for the ticket number before proceeding. If the format is correct, allow the commit."
    }
  }]
}
```

### Alur kerja yang diharapkan

1. Developer minta agent: *"commit perubahan ini"*
2. Hook intercept dan validasi format
3. Jika JIRAID tidak ada → agent tanya user: *"Tiket Jira mana yang terkait? (contoh: SJT-001)"*
4. User jawab → agent format commit message dengan benar
5. Commit dieksekusi

### Git workflow tetap manual

Untuk operasi git yang kompleks, developer tetap melakukan secara manual atau meminta agent dengan instruksi eksplisit:

```
# Developer meminta:
"fetch dan cek ada conflict tidak"
"commit dengan tiket SJT-042 lalu push ke branch feature/xyz"
```

Agent akan menjalankan step-by-step dengan konfirmasi jika ada conflict.

## Konsekuensi

- **Positif**: 
  - Commit message selalu sesuai konvensi tanpa perlu setup commitlint
  - Agent tidak bisa commit tanpa JIRAID yang valid
  - Workflow git kompleks tetap butuh approval manusia
  
- **Negatif**: 
  - Hook hanya aktif saat menggunakan Kiro (tidak enforce di CLI langsung)
  - Perlu setup commitlint + husky terpisah jika ingin enforce di luar Kiro
  
- **Yang harus dijaga**:
  - Hook ini melengkapi, bukan menggantikan, git hooks native
  - Jangan expand scope hook ke auto-resolve atau auto-push
  - Review commit sebelum push tetap tanggung jawab developer

## Referensi

- ADR-0018: Trunk-Based Development dengan Release Train
- `.kiro/steering/commit-conventions.md`
