/**
 * Hanya mode mock: menyelesaikan pembayaran seperti callback gateway, supaya alur sukses dan gagal bisa didemokan.
 * Terpisah dari `OrderProtocol` supaya protocol itu hanya berisi kontrak BE untuk klien (ADR-0014, ISP).
 */
export interface PaymentSimulatorProtocol {
  settle(bookingId: string, outcome: "PAID" | "FAILED"): Promise<void>;
}
