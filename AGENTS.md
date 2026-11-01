# AGENTS.md

Repo frontend Rusuh Booking Tiket (Next.js, Telkomsel Signal DS, Tailwind). Satu aplikasi dengan modul fitur Clean Architecture dan DI Awilix (ADR-0013–0015), bukan monorepo.

Sebelum mengubah kode, baca dan ikuti:

1. `docs/ai/steering/product.md`
2. `docs/ai/steering/architecture-rules.md`
3. `docs/ai/steering/coding-conventions.md`
4. `docs/ai/steering/testing.md`

Prosedur berulang ada di `docs/ai/skills/`. Keputusan arsitektur ada di `docs/adr/`.

Jangan menghapus atau memangkas apa pun di `docs/ai/`. Catat sesi yang menghasilkan perubahan signifikan di `docs/ai/usage-log.md`.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
