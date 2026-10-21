---
name: sync-api-contract
description: Menyinkronkan FE dengan openapi.yaml terbaru dari BE — regenerate tipe, perbarui schema zod, adapter, pemetaan error, dan skenario MSW. Gunakan setiap kali BE mengubah kontrak API.
---

# Sync API Contract

## Langkah

1. **Ambil spec terbaru** dari lokasi yang disepakati dengan BE, simpan ke `packages/api/openapi.yaml`.
2. **Regenerate tipe**: `pnpm --filter @rusuh/api generate`. Jangan mengedit `generated/` secara manual. (Script `generate` belum ada; ditambahkan saat `openapi.yaml` tersedia. Sampai itu, kontrak ada di schema zod adapter dan `mocks/src/handlers.ts`.)
3. **Baca diff tipe generated.** Klasifikasikan setiap perubahan:
   - **Tambah field opsional**: perbarui schema zod bila FE memakainya.
   - **Ubah atau hapus field**: perbarui schema zod, mapper ke tipe `core`, dan semua pemakai. Jalankan `pnpm typecheck`.
   - **Error code baru**: tambah ke union `AppError` di `core/errors`, pemetaan di adapter, key i18n, dan tampilan di ViewModel terkait.
   - **Endpoint baru**: tambah adapter, query key, hook.
4. **Perbarui skenario MSW** di `mocks/` agar sesuai bentuk response baru.
5. **Jalankan** `pnpm lint && pnpm typecheck && pnpm test`.
6. **Catat breaking change** di deskripsi PR, dengan tag `contract`.

## Checklist

- [ ] Tipe generated tidak diimpor langsung oleh `ui` atau `features`.
- [ ] Setiap error code di katalog ADR-0009 masih punya pemetaan.
- [ ] Jika kontrak WebView (ADR-0008) berubah, tim Mobile sudah dikabari.
