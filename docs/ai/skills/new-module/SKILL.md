---
name: new-module
description: Menambah modul fitur baru (bounded context) di src/modules dengan lapisan domain, application, infrastructure, presentation, dan registrasi Awilix. Gunakan saat fitur baru tidak cocok di modul yang ada (mis. auth, ticket, maintenance, admin).
---

# New Module

Baca dulu ADR-0013, ADR-0014, ADR-0015 dan `docs/ai/steering/architecture-rules.md`.

## Kapan modul baru

- Konsep bisnisnya punya bahasa sendiri (entitas, aturan, endpoint) dan bisa dimiliki satu orang atau tim.
- Bukan sekadar layar tambahan dari konsep yang sudah ada (itu skill `new-feature-screen` di modul yang ada).
- Bila dua modul butuh hal yang sama, jangan saling mengimpor: pindahkan ke `src/core` (domain/application murni), `src/platform` (adapter), atau `src/ui` (presentation).

## Langkah

1. **Folder**: `src/modules/<m>/{domain,application,infrastructure,presentation/views,presentation/__tests__}`. Nama modul camelCase, kata benda.
2. **Domain**: tipe dan aturan murni di `domain/`, dengan test.
3. **Application**: port (`<Nama>Repository.ts`), use case (`<KataKerja><Benda>.ts`), dan `dependencies.ts`:
   ```ts
   export type <M>Dependencies = { getThing: GetThing };
   ```
4. **Infrastructure**: `Http<Nama>Repository.ts` mengimplementasikan port lewat `HttpClient` + zod.
5. **Registrasi** `src/modules/<m>/<m>.module.ts`:
   ```ts
   export type <M>Cradle = <M>Dependencies & { thingRepository: ThingRepository };
   export function <m>Module(): NameAndRegistrationPair<<M>Cradle> {
     return {
       thingRepository: asClass(HttpThingRepository).singleton(),
       getThing: asClass(GetThing).singleton(),
     };
   }
   ```
6. **Composition root** `src/di/container.ts`: tambah `<M>Cradle` ke `AppCradle` dan `...<m>Module()` di `createAppContainer`. Itu satu-satunya file di luar modul yang berubah.
7. **Presentation**: ikuti skill `new-feature-screen` untuk setiap layar.
8. **Mock**: handler dan skenario di `src/mocks/handlers.ts`.
9. **Route**: `src/app/...` merender Container modul; layout memasang `AppProviders`.
10. **Dokumentasi**: tambah baris modul di `docs/architecture/overview.md` (§3) dan peta route di `docs/architecture/routing-and-layers.md`.

## Checklist

- [ ] `pnpm lint` hijau: tidak ada impor dari atau ke modul lain.
- [ ] `src/di/container.test.ts` hijau (semua registrasi baru bisa di-resolve).
- [ ] Use case punya test dengan fake port; adapter punya test MSW.
- [ ] Tidak ada `awilix` di luar `<m>.module.ts`.
