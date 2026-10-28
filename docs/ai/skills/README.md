# Skills

Prosedur berulang dalam format `SKILL.md` (frontmatter `name` + `description`) yang bisa dimuat AI agent. Manusia juga bisa mengikutinya sebagai checklist.

| Skill | Kapan dipakai |
|---|---|
| [`new-module`](new-module/SKILL.md) | Menambah modul fitur baru (bounded context) dengan lapisan dan registrasi DI |
| [`new-feature-screen`](new-feature-screen/SKILL.md) | Membuat layar baru di modul (use case + ViewModel + Container + View + test) |
| [`new-ui-component`](new-ui-component/SKILL.md) | Membuat komponen presentasional (design system atau view modul) |
| [`sync-api-contract`](sync-api-contract/SKILL.md) | BE memperbarui `openapi.yaml` |
| [`write-adr`](write-adr/SKILL.md) | Ada keputusan arsitektur baru atau perubahan keputusan lama |

Untuk Claude Code, salin atau symlink folder ini ke `.claude/skills/`. Sumber kebenarannya tetap di `docs/ai/skills/`.
