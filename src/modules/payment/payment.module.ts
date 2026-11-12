/**
 * @file payment.module.ts
 * @description Payment Module - API Contracts v2.1
 *
 * DI registration untuk payment module components.
 * Menggunakan Awilix untuk dependency injection (ADR-0013–0015).
 */

import { asFunction, type NameAndRegistrationPair } from "awilix";

// Use case factories
import { createGetOrderUseCase } from "./application/get-order.use-case";
import { createGetAvailableMethodsUseCase } from "./application/get-available-methods.use-case";
import { createStartPaymentUseCase } from "./application/start-payment.use-case";
import { createRetryPaymentUseCase } from "./application/retry-payment.use-case";
import { createWatchOrderUseCase } from "./application/watch-order.use-case";
import { createGetPaymentEventUseCase } from "./application/get-payment-event.use-case";
import { createSimulatePaymentUseCase } from "./application/simulate-payment.use-case";
import { createHandleWebViewHandoffUseCase } from "./application/handle-webview-handoff.use-case";

// Service factories
import { createHttpOrderService } from "./data/http-order.service";
import { createHttpPaymentSimulatorService } from "./data/http-payment-simulator.service";
import { createWebViewHandoffService } from "./data/webview-handoff.service";
import { createWebViewBridgeService } from "./data/webview-bridge.service";

// Types
import type { PaymentDependencies } from "./application/payment.dependencies";
import type { OrderProtocol } from "./domain/order.protocol";
import type { PaymentSimulatorProtocol } from "./domain/payment-simulator.protocol";
import type { WebViewHandoffProtocol, WebViewBridgeProtocol } from "./domain/webview-handoff.protocol";
import type { HandleWebViewHandoffUseCase } from "./application/handle-webview-handoff.use-case";

/* ========================================================================== */
/*                                   Types                                    */
/* ========================================================================== */

/**
 * Payment module registry type.
 * Extends PaymentDependencies dengan service protocols.
 */
export type PaymentRegistry = PaymentDependencies & {
  readonly orderService: OrderProtocol;
  readonly paymentSimulatorService: PaymentSimulatorProtocol;
  readonly webViewHandoffService: WebViewHandoffProtocol;
  readonly webViewBridgeService: WebViewBridgeProtocol;
  readonly handleWebViewHandoffUseCase: HandleWebViewHandoffUseCase;
};

/* ========================================================================== */
/*                            Module Registration                             */
/* ========================================================================== */

/**
 * Membuat Awilix registration untuk payment module.
 *
 * Semua komponen diregister sebagai singleton untuk efisiensi.
 *
 * @returns NameAndRegistrationPair untuk Awilix container
 */
export const paymentModule = (): NameAndRegistrationPair<PaymentRegistry> => ({
  // =========================================================================
  // Services (Infrastructure Layer)
  // =========================================================================

  /** HTTP service untuk order dan payment operations */
  orderService: asFunction(createHttpOrderService).singleton(),

  /** HTTP service untuk simulasi pembayaran (mock mode only) */
  paymentSimulatorService: asFunction(createHttpPaymentSimulatorService).singleton(),

  // =========================================================================
  // Use Cases (Application Layer)
  // =========================================================================

  /** Use case untuk mengambil detail order */
  getOrderUseCase: asFunction(createGetOrderUseCase).singleton(),

  /** Use case untuk mengambil metode pembayaran yang tersedia */
  getAvailableMethodsUseCase: asFunction(createGetAvailableMethodsUseCase).singleton(),

  /** Use case untuk memulai pembayaran */
  startPaymentUseCase: asFunction(createStartPaymentUseCase).singleton(),

  /** Use case untuk retry pembayaran dengan metode baru */
  retryPaymentUseCase: asFunction(createRetryPaymentUseCase).singleton(),

  /** Use case untuk polling status pembayaran */
  watchOrderUseCase: asFunction(createWatchOrderUseCase).singleton(),

  /** Use case untuk mengambil detail event */
  getPaymentEventUseCase: asFunction(createGetPaymentEventUseCase).singleton(),

  /** Use case untuk simulasi pembayaran (mock mode only) */
  simulatePaymentUseCase: asFunction(createSimulatePaymentUseCase).singleton(),

  // =========================================================================
  // WebView Handoff (ADR-007)
  // =========================================================================

  /** HTTP service untuk operasi WebView payment handoff */
  webViewHandoffService: asFunction(createWebViewHandoffService).singleton(),

  /** WebView bridge service untuk komunikasi ke aplikasi mobile */
  webViewBridgeService: asFunction(createWebViewBridgeService).singleton(),

  /** Use case untuk handle WebView handoff exchange */
  handleWebViewHandoffUseCase: asFunction(createHandleWebViewHandoffUseCase).scoped(),
});
