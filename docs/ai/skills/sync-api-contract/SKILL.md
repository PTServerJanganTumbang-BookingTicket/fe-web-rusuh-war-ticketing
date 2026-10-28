---
name: sync-api-contract
description: Menyinkronkan FE dengan openapi.yaml terbaru dari BE — regenerate tipe, perbarui schema zod, adapter infrastructure, port, pemetaan error, dan skenario MSW. Gunakan setiap kali BE mengubah kontrak API.
---

# Sync API Contract

## Langkah

1. **Ambil spec terbaru** dari lokasi yang disepakati dengan BE, simpan ke `src/platform/http/openapi.yaml`.
2. **Regenerate tipe**: `pnpm generate` ke `src/platform/http/generated/`. Jangan mengedit `generated/` secara manual. (Script `generate` belum ada; ditambahkan saat `openapi.yaml` tersedia. Sampai itu, kontrak ada di schema zod adapter `src/modules/<m>/infrastructure` dan `src/mocks/handlers.ts`.)
3. **Baca diff tipe generated.** Klasifikasikan setiap perubahan:
   - **Tambah field opsional**: perbarui schema zod bila FE memakainya.
   - **Ubah atau hapus field**: perbarui schema zod dan pemetaan di adapter `infrastructure` ke tipe `domain`. Bila tipe domain ikut berubah, perbarui port, use case, dan pemakai. Jalankan `pnpm typecheck`.
   - **Error code baru**: tambah ke union `AppError` di `src/core/domain/errors`, pemetaan di adapter, key i18n, dan tampilan di ViewModel terkait.
   - **Endpoint baru**: tambah method di port (atau port baru), use case, implementasi adapter, registrasi di `<m>.module.ts`, query options.
4. **Perbarui skenario MSW** di `src/mocks/` agar sesuai bentuk response baru.
5. **Jalankan** `pnpm lint && pnpm typecheck && pnpm test`.
6. **Catat breaking change** di deskripsi PR, dengan tag `contract`.

## Checklist

- [ ] Tipe generated hanya diimpor oleh `infrastructure`, tidak oleh `domain`, `application`, atau `presentation`.
- [ ] Setiap error code di katalog ADR-0009 masih punya pemetaan.
- [ ] Jika kontrak WebView (ADR-0008) berubah, tim Mobile sudah dikabari.
