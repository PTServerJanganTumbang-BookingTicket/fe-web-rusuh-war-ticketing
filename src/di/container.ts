import { createContainer, InjectionMode, type AwilixContainer } from "awilix";
import { bookingModule, type BookingRegistry } from "@/modules/booking/booking.module";
import { catalogModule, type CatalogRegistry } from "@/modules/catalog/catalog.module";
import { paymentModule, type PaymentRegistry } from "@/modules/payment/payment.module";
import { queueModule, type QueueRegistry } from "@/modules/queue/queue.module";
import { ticketModule, type TicketRegistry } from "@/modules/ticket/ticket.module";
import type { AppConfig } from "@/core/domain/app-config.model";
import { coreModule, type CoreRegistry } from "./core.module";

/** Seluruh isi container. Modul baru menambah irisannya di sini dan di `createAppContainer` (ADR-0015). */
export type AppRegistry = CoreRegistry &
  CatalogRegistry &
  QueueRegistry &
  BookingRegistry &
  PaymentRegistry &
  TicketRegistry;

export type AppContainer = AwilixContainer<AppRegistry>;

/**
 * Composition root. Satu-satunya tempat service dari `data/` dipasangkan ke protocol.
 * PROXY: dependensi dibaca dari objek `cradle` Awilix (aman diminifikasi). strict: registrasi yang hilang
 * dan lifetime yang bocor langsung gagal.
 */
export function createAppContainer(appConfig: AppConfig): AppContainer {
  const container = createContainer<AppRegistry>({ injectionMode: InjectionMode.PROXY, strict: true });
  container.register({
    ...coreModule(appConfig),
    ...catalogModule(),
    ...queueModule(),
    ...bookingModule(),
    ...paymentModule(),
    ...ticketModule(),
  });
  return container;
}
