---
name: sync-api-contract
description: Menyinkronkan FE dengan openapi.yaml terbaru dari BE — regenerate tipe, perbarui schema zod, service, protocol, pemetaan error, dan skenario MSW. Gunakan setiap kali BE mengubah kontrak API.
---

# Sync API Contract

## Langkah

1. **Ambil spec terbaru** dari lokasi yang disepakati dengan BE, simpan ke `src/core/data/http/openapi.yaml`.
2. **Regenerate tipe**: `npm run generate` ke `src/core/data/http/generated/`. Jangan mengedit `generated/` secara manual. (Script `generate` belum ada; ditambahkan saat `openapi.yaml` tersedia. Sampai itu, kontrak ada di schema zod `src/modules/<m>/data/*.schema.ts` dan `src/mocks/handlers.ts`.)
3. **Baca diff tipe generated.** Klasifikasikan setiap perubahan:
   - **Tambah field opsional**: perbarui schema zod bila FE memakainya.
   - **Ubah atau hapus field**: perbarui schema zod di `data/<nama>.schema.ts` (`satisfies z.ZodType<Model>` menandai model yang ikut berubah). Bila model ikut berubah, perbarui protocol, use case, dan pemakai. Jalankan `npm run typecheck`.
   - **Error code baru**: tambah ke `ApiErrorCode` di `src/core/domain/app-error.ts` (pemetaannya otomatis lewat `FetchHttpClient`), key i18n, dan tampilan di controller terkait.
   - **Endpoint baru**: tambah method di protocol (atau protocol baru), use case, implementasi service, registrasi di `<m>.module.ts`, query options.
4. **Perbarui skenario MSW** di `src/mocks/` agar sesuai bentuk response baru.
5. **Jalankan** `npm run lint && npm run typecheck && npm test`.
6. **Catat breaking change** di deskripsi PR, dengan tag `contract`.

## Checklist

- [ ] Tipe generated hanya diimpor oleh `data`, tidak oleh `domain`, `application`, `controllers`, atau `views`.
- [ ] Setiap error code di katalog ADR-0009 masih punya pemetaan.
- [ ] Jika kontrak WebView (ADR-0008) berubah, tim Mobile sudah dikabari.
