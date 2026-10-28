import { createContainer, InjectionMode, type AwilixContainer } from "awilix";
import { bookingModule, type BookingCradle } from "@/modules/booking/booking.module";
import { catalogModule, type CatalogCradle } from "@/modules/catalog/catalog.module";
import { paymentModule, type PaymentCradle } from "@/modules/payment/payment.module";
import { queueModule, type QueueCradle } from "@/modules/queue/queue.module";
import type { AppConfig } from "@/core/application/AppConfig";
import { coreModule, type CoreCradle } from "./core.module";

/** Seluruh isi container. Modul baru menambah irisannya di sini dan di `createAppContainer` (ADR-0015). */
export type AppCradle = CoreCradle & CatalogCradle & QueueCradle & BookingCradle & PaymentCradle;

export type AppContainer = AwilixContainer<AppCradle>;

/**
 * Composition root. Satu-satunya tempat implementasi infrastruktur dipasangkan ke port.
 * PROXY: dependensi dibaca dari objek cradle (aman diminifikasi). strict: registrasi yang hilang
 * dan lifetime yang bocor langsung gagal.
 */
export function createAppContainer(appConfig: AppConfig): AppContainer {
  const container = createContainer<AppCradle>({ injectionMode: InjectionMode.PROXY, strict: true });
  container.register({
    ...coreModule(appConfig),
    ...catalogModule(),
    ...queueModule(),
    ...bookingModule(),
    ...paymentModule(),
  });
  return container;
}
