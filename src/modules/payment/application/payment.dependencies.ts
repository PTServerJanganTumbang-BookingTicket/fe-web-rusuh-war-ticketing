/**
 * @file payment.dependencies.ts
 * @description Payment Module Dependencies - API Contracts v2.1
 *
 * Type aggregation untuk semua use case di modul payment.
 * Digunakan untuk DI container registration.
 */

import type { GetOrderUseCase } from "./get-order.use-case";
import type { GetAvailableMethodsUseCase } from "./get-available-methods.use-case";
import type { StartPaymentUseCase } from "./start-payment.use-case";
import type { RetryPaymentUseCase } from "./retry-payment.use-case";
import type { WatchOrderUseCase } from "./watch-order.use-case";
import type { GetPaymentEventUseCase } from "./get-payment-event.use-case";
import type { SimulatePaymentUseCase } from "./simulate-payment.use-case";
import type { HandleWebViewHandoffUseCase } from "./handle-webview-handoff.use-case";
import type { PaymentSessionProtocol } from "../domain/payment-session.protocol";
import type { WebViewBridgeProtocol } from "../domain/webview-handoff.protocol";

/**
 * Aggregated type untuk semua dependencies payment module.
 * Digunakan sebagai generic type parameter untuk useDependencies hook.
 */
export type PaymentDependencies = {
  /** Use case untuk mengambil detail order */
  readonly getOrderUseCase: GetOrderUseCase;

  /** Use case untuk mengambil metode pembayaran yang tersedia */
  readonly getAvailableMethodsUseCase: GetAvailableMethodsUseCase;

  /** Use case untuk memulai pembayaran */
  readonly startPaymentUseCase: StartPaymentUseCase;

  /** Use case untuk retry pembayaran dengan metode baru */
  readonly retryPaymentUseCase: RetryPaymentUseCase;

  /** Use case untuk polling status pembayaran */
  readonly watchOrderUseCase: WatchOrderUseCase;

  /** Use case untuk mengambil detail event */
  readonly getPaymentEventUseCase: GetPaymentEventUseCase;

  /** Use case untuk simulasi pembayaran (mock mode only) */
  readonly simulatePaymentUseCase: SimulatePaymentUseCase;

  /** Use case untuk handle WebView handoff exchange (ADR-007) */
  readonly handleWebViewHandoffUseCase: HandleWebViewHandoffUseCase;

  /** Service untuk komunikasi WebView ↔ mobile app (ADR-007) */
  readonly webViewBridgeService: WebViewBridgeProtocol;

  /** Penyimpan payment session WebView di memori (ADR-007 §6) */
  readonly paymentSessionService: PaymentSessionProtocol;
};
