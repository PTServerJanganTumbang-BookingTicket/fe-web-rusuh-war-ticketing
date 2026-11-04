/**
 * @file payment-simulator.protocol.ts
 * @description Payment Simulator Protocol
 *
 * Protocol untuk simulasi hasil pembayaran (mock mode only).
 * Terpisah dari OrderProtocol sesuai Interface Segregation Principle (ADR-0014).
 */

/**
 * Protocol untuk simulasi pembayaran.
 *
 * Hanya digunakan dalam mode mock untuk:
 * - Menyelesaikan pembayaran seperti callback dari payment gateway
 * - Memungkinkan testing alur sukses dan gagal
 *
 * Di backend asli, endpoint ini (POST /payments/webhook) hanya untuk gateway
 * dan membutuhkan tanda tangan yang valid.
 */
export interface PaymentSimulatorProtocol {
  /**
   * Mensimulasikan hasil pembayaran.
   *
   * @param bookingId - ID booking yang akan disimulasikan hasilnya
   * @param outcome - Hasil simulasi: "PAID" untuk sukses, "FAILED" untuk gagal
   */
  settle(bookingId: string, outcome: "PAID" | "FAILED"): Promise<void>;
}
