---
name: new-module
description: Menambah modul fitur baru (bounded context) di src/modules dengan lapisan domain, application, data, controllers, views, dan registrasi Awilix. Gunakan saat fitur baru tidak cocok di modul yang ada (mis. auth, ticket, maintenance, admin).
---

# New Module

Baca dulu ADR-0013, ADR-0014, ADR-0015 dan `docs/ai/steering/architecture-rules.md`.

## Kapan modul baru

- Konsep bisnisnya punya bahasa sendiri (model, aturan, endpoint) dan bisa dimiliki satu orang atau tim.
- Bukan sekadar layar tambahan dari konsep yang sudah ada (itu skill `new-feature-screen` di modul yang ada).
- Bila dua modul butuh hal yang sama, jangan saling mengimpor: pindahkan ke lapisan yang sama di `src/core` (`core/domain`, `core/application`, `core/data`, `core/controllers`, `core/views`).

## Langkah

Contoh di bawah memakai modul `ticket` dengan sumber daya `Ticket`.

1. **Folder**: `src/modules/<m>/{domain,application,data,controllers,views}`. Nama modul camelCase, kata benda.
2. **Domain**:
   - `ticket.model.ts`: tipe model.
   - `ticket.rules.ts`: aturan murni, dengan `ticket.rules.test.ts` di sebelahnya.
   - `ticket.constants.ts`: angka bisnis, masing-masing dengan rujukan requirement atau ADR.
   - `ticket.protocol.ts`: `interface TicketProtocol { get(id: string): Promise<Ticket> }`.
3. **Application**: use case `get-ticket.use-case.ts` (`createGetTicketUseCase({ ticketService }: { ticketService: TicketProtocol }): GetTicketUseCase`), dan `ticket.dependencies.ts`:
   ```ts
   export type TicketDependencies = { getTicketUseCase: GetTicketUseCase };
   ```
4. **Data**: `ticket.schema.ts` (`ticketSchema = z.object({...}) satisfies z.ZodType<Ticket>`) dan `http-ticket.service.ts` (`createHttpTicketService({ httpClient }: { httpClient: HttpClient }): TicketProtocol`, memanggil `HttpClient` dengan `ticketSchema`).
5. **Registrasi** `src/modules/ticket/ticket.module.ts`:
   ```ts
   export type TicketRegistry = TicketDependencies & { ticketService: TicketProtocol };
   export function ticketModule(): NameAndRegistrationPair<TicketRegistry> {
     return {
       ticketService: asClass(HttpTicketService).singleton(),
       getTicketUseCase: asClass(GetTicketUseCase).singleton(),
     };
   }
   ```
6. **Composition root** `src/di/container.ts`: tambah `TicketRegistry` ke `AppRegistry` dan `...ticketModule()` di `createAppContainer`. Itu satu-satunya file di luar modul yang berubah.
7. **Controllers dan views**: ikuti skill `new-feature-screen` untuk setiap layar.
8. **Mock**: handler dan skenario di `src/mocks/handlers.ts`.
9. **Route**: `src/app/...` merender Container modul; layout memasang `AppProviders`.
10. **Dokumentasi**: tambah baris modul di `docs/architecture/overview.md` (§3) dan peta route di `docs/architecture/routing-and-layers.md`.

## Checklist

- [ ] `npm run lint` hijau: tidak ada impor dari atau ke modul lain.
- [ ] `src/di/container.test.ts` hijau (semua registrasi baru bisa di-resolve).
- [ ] Use case punya test dengan fake protocol; service punya test MSW di `src/test/http-services.test.ts`.
- [ ] Tidak ada `awilix` di luar `<m>.module.ts`.
- [ ] Nama file memakai akhiran peran (`.model.ts`, `.protocol.ts`, `.use-case.ts`, `.service.ts`, `.schema.ts`, ...).
