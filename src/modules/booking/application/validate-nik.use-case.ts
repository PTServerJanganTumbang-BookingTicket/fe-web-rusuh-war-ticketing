import type { NikCheck } from "../domain/booking-request.model";
import type { BookingProtocol } from "../domain/booking.protocol";

export type ValidateNikUseCase = (nik: string) => Promise<NikCheck>;

/** Cek NIK ke Dukcapil sebelum submit supaya galat muncul di field (BR-02). Server tetap mengecek ulang. */
export function createValidateNikUseCase({
  bookingService,
}: {
  bookingService: BookingProtocol;
}): ValidateNikUseCase {
  return (nik) => bookingService.validateNik(nik);
}
