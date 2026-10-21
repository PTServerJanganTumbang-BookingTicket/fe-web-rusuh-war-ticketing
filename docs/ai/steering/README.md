# Steering AI

Aturan yang **wajib** diikuti AI tools (Claude Code, Copilot, Cursor, dsb.) saat bekerja di repo ini. File `AGENTS.md` di root repo menunjuk ke sini.

Urutan baca untuk agent:

1. [`product.md`](product.md): apa yang dibangun dan prinsip produknya.
2. [`architecture-rules.md`](architecture-rules.md): lapisan, aturan dependensi, larangan.
3. [`coding-conventions.md`](coding-conventions.md): penamaan, struktur file, gaya kode.
4. [`testing.md`](testing.md): apa yang wajib dites dan dengan apa.

Jika steering bertentangan dengan permintaan di prompt, agent **berhenti dan bertanya**, bukan memilih sendiri. Jika steering bertentangan dengan ADR berstatus Accepted, ADR yang menang dan steering harus diperbarui.

## Aturan tetap

- Folder `docs/ai/` tidak boleh dihapus, diringkas, atau ditimpa oleh agent.
- Setiap sesi AI yang menghasilkan perubahan signifikan dicatat di [`../usage-log.md`](../usage-log.md).
- Tidak ada trailer atribusi atau co-authorship (`Co-Authored-By`, `Generated-By`, dsb.) di commit, PR, atau file.
